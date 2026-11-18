import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Clock,
  ExternalLink,
  Loader2,
  Package,
  RefreshCw,
  ShoppingBag,
  X,
} from 'lucide-react';
import type { Order, OrderStatus } from '@/types';
import {
  cancelOrder,
  confirmOrder,
  fetchMyOrders,
  fetchOrder,
  openCheckout,
  syncOrder,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatChatTime } from '@/lib/format';
import { trackPurchase } from '@/lib/analytics';

interface Props {
  onClose: () => void;
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending payment',
  paid: 'Paid',
  released: 'Completed',
  canceled: 'Canceled',
  failed: 'Failed',
};

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  paid: 'bg-sky-50 text-sky-700 ring-sky-200',
  released: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  canceled: 'bg-slate-100 text-slate-500 ring-slate-200',
  failed: 'bg-rose-50 text-rose-700 ring-rose-200',
};

/** `amount_cents` + `currency` → a display string such as "$12.50". */
function formatMoney(cents: number, currency: string): string {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    // Unknown/blank currency code — fall back to a plain "12.50 USD" rather than throwing.
    return `${amount.toFixed(2)} ${currency}`.trim();
  }
}

const PURCHASE_TRACKED_PREFIX = 'chatimall_purchase_tracked_';

/**
 * Fire `ecommerce_purchase` EXACTLY ONCE per order.
 *
 * This event drives revenue / ARPU / ARPPU, so a re-sync, a remount, or flicking between the
 * Marketplace and the Orders screen must never count the same order twice. We remember the
 * references we've already counted in localStorage (durable across reloads); a module-level set is
 * a second guard for when storage is blocked (private mode, quota).
 */
const trackedPurchases = new Set<string>();
function trackPurchaseOnce(order: Order): void {
  // 'released' implies the order was paid, so a screen that only ever saw the released state still
  // counts it — the dedupe below keeps it to a single event either way.
  if (order.status !== 'paid' && order.status !== 'released') return;
  if (trackedPurchases.has(order.reference)) return;
  const key = `${PURCHASE_TRACKED_PREFIX}${order.reference}`;
  try {
    if (localStorage.getItem(key)) {
      trackedPurchases.add(order.reference);
      return;
    }
    localStorage.setItem(key, '1');
  } catch {
    // Storage unavailable — the in-memory set still prevents a same-session double count.
  }
  trackedPurchases.add(order.reference);
  trackPurchase({
    orderReference: order.reference,
    amountMajor: order.amountCents / 100,
    currency: order.currency,
  });
}

export default function OrdersScreen({ onClose }: Props) {
  const { userId } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // order id with an action in flight
  const [refreshing, setRefreshing] = useState(false);
  const [confirming, setConfirming] = useState<Order | null>(null);

  // Mirrors `orders` so the event listeners below always read the latest list without re-subscribing.
  const ordersRef = useRef<Order[]>([]);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2800);
  };

  const applyOrders = useCallback((next: Order[]) => {
    ordersRef.current = next;
    setOrders(next);
  }, []);

  const mergeOrder = useCallback(
    (updated: Order) => {
      applyOrders(ordersRef.current.map((o) => (o.id === updated.id ? updated : o)));
    },
    [applyOrders]
  );

  const load = useCallback(async (): Promise<Order[]> => {
    setError(null);
    try {
      const list = await fetchMyOrders();
      applyOrders(list);
      // Count any order that is already paid when we first see it (e.g. the app was reopened after
      // the buyer paid elsewhere). The localStorage guard keeps this idempotent.
      list.forEach(trackPurchaseOnce);
      return list;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your orders.');
      return ordersRef.current;
    } finally {
      setLoading(false);
    }
  }, [applyOrders]);

  // Ask the server to re-check the gateway for one order and fold the result back in.
  const syncOne = useCallback(
    async (order: Order): Promise<void> => {
      if (order.status !== 'pending') {
        trackPurchaseOnce(order);
        return;
      }
      try {
        const latest = await syncOrder(order.id);
        mergeOrder(latest);
        trackPurchaseOnce(latest);
      } catch {
        // A failed sync (offline, gateway hiccup, or an order that already moved on) must not blank
        // the row — fall back to a plain read so the card still reflects the server's truth.
        try {
          const latest = await fetchOrder(order.id);
          mergeOrder(latest);
          trackPurchaseOnce(latest);
        } catch {
          /* keep showing the last known state */
        }
      }
    },
    [mergeOrder]
  );

  const syncMany = useCallback(
    async (list: Order[]) => {
      const pending = list.filter((o) => o.status === 'pending');
      if (!pending.length) return;
      setRefreshing(true);
      await Promise.all(pending.map((o) => syncOne(o)));
      setRefreshing(false);
    },
    [syncOne]
  );

  // The OPay returnUrl lands back on the app with ?reference=… (or ?order=…). Sync that order and
  // strip the param so a refresh can't replay it forever.
  const consumeReturnParam = useCallback(
    async (list: Order[]): Promise<void> => {
      const params = new URLSearchParams(window.location.search);
      const idParam = params.get('order');
      const refParam = params.get('reference');
      if (!idParam && !refParam) return;
      params.delete('order');
      params.delete('reference');
      const qs = params.toString();
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`
      );
      const target = idParam
        ? list.find((o) => o.id === idParam)
        : list.find((o) => o.reference === refParam);
      if (target) await syncOne(target);
    },
    [syncOne]
  );

  // Initial load: fetch, honour any OPay return param, then catch up every still-pending order.
  useEffect(() => {
    let active = true;
    void (async () => {
      const list = await load();
      if (!active) return;
      await consumeReturnParam(list);
      await syncMany(ordersRef.current);
    })();
    return () => {
      active = false;
    };
  }, [load, consumeReturnParam, syncMany]);

  // Coming back from OPay's page (or refocusing the tab) re-syncs pending orders automatically.
  useEffect(() => {
    const onReturn = () => {
      if (document.visibilityState === 'visible') void syncMany(ordersRef.current);
    };
    document.addEventListener('visibilitychange', onReturn);
    window.addEventListener('focus', onReturn);
    return () => {
      document.removeEventListener('visibilitychange', onReturn);
      window.removeEventListener('focus', onReturn);
    };
  }, [syncMany]);

  const pay = (order: Order) => {
    if (!order.checkoutUrl) {
      flash('This order has no checkout link — tap Refresh status.');
      return;
    }
    openCheckout(order.checkoutUrl);
  };

  const refresh = async (order: Order) => {
    setBusy(order.id);
    await syncOne(order);
    setBusy(null);
  };

  const cancel = async (order: Order) => {
    setBusy(order.id);
    try {
      mergeOrder(await cancelOrder(order.id));
      flash('Order canceled.');
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Could not cancel the order.');
    }
    setBusy(null);
  };

  const release = async (order: Order) => {
    setBusy(order.id);
    try {
      mergeOrder(await confirmOrder(order.id));
      setConfirming(null);
      flash('Confirmed — the seller is now cleared for payout.');
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Could not confirm the order.');
    }
    setBusy(null);
  };

  const purchases = orders.filter((o) => o.buyerId === userId);
  const sales = orders.filter((o) => o.sellerId === userId);

  const renderOrder = (o: Order) => {
    const isBuyer = o.buyerId === userId;
    const isBusy = busy === o.id;
    return (
      <div key={o.id} className="rounded-2xl bg-white ring-1 ring-black/[0.05] shadow-soft p-3.5 space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-[15px] text-ink leading-snug truncate">{o.listingTitle || 'Listing removed'}</h3>
            <p className="text-[11px] text-ink-faint mt-0.5">{formatChatTime(o.createdAt)}</p>
          </div>
          <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold ring-1 ${STATUS_STYLE[o.status]}`}>
            {STATUS_LABEL[o.status]}
          </span>
        </div>

        <div className="text-base font-extrabold text-brand-700">{formatMoney(o.amountCents, o.currency)}</div>

        {o.note && <p className="text-[12px] text-ink-mute bg-paper-mist rounded-xl px-3 py-2">{o.note}</p>}

        {/* Seller side: the money is held in escrow until the buyer confirms receipt. */}
        {!isBuyer && o.status === 'paid' && (
          <p className="flex items-start gap-2 text-[11px] text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
            <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>
              The money is held in escrow until the buyer confirms receipt. Hand over the item, then the buyer
              taps “Confirm received” to release it to you.
            </span>
          </p>
        )}
        {!isBuyer && o.status === 'released' && (
          <p className="flex items-start gap-2 text-[11px] text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">
            <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>The buyer confirmed receipt. Your payout has been authorised and will be settled to you.</span>
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {isBuyer && o.status === 'pending' && (
            <>
              {o.checkoutUrl && (
                <button
                  onClick={() => pay(o)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-lift"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Pay now
                </button>
              )}
              <button
                onClick={() => void refresh(o)}
                disabled={isBusy}
                className="px-3.5 py-2 rounded-xl bg-paper-mist text-ink text-xs font-bold flex items-center gap-1.5 disabled:opacity-60"
              >
                {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Refresh status
              </button>
              <button
                onClick={() => void cancel(o)}
                disabled={isBusy}
                className="px-3.5 py-2 rounded-xl text-rose-600 text-xs font-bold hover:bg-rose-50 disabled:opacity-60"
              >
                Cancel order
              </button>
            </>
          )}
          {isBuyer && o.status === 'paid' && (
            <>
              <button
                onClick={() => setConfirming(o)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-lift"
              >
                <Check className="w-3.5 h-3.5" /> Confirm received
              </button>
              <button
                onClick={() => void refresh(o)}
                disabled={isBusy}
                className="px-3.5 py-2 rounded-xl bg-paper-mist text-ink text-xs font-bold flex items-center gap-1.5 disabled:opacity-60"
              >
                {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Refresh status
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-[80] bg-paper flex flex-col select-none">
      {toast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[95] max-w-[90%] px-4 py-2 rounded-xl bg-ink text-white text-xs font-semibold shadow-xl text-center">
          {toast}
        </div>
      )}

      <div className="bg-paper px-4 pt-12 pb-3 flex-shrink-0 border-b border-paper-line">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-brand-700" />
            <h1 className="text-[26px] font-extrabold text-ink tracking-tight">Orders</h1>
          </div>
          <div className="flex items-center gap-2">
            {refreshing && <Loader2 className="w-4 h-4 animate-spin text-ink-faint" />}
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-paper-mist text-ink-mute" title="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <p className="text-[11px] text-ink-mute mt-1">
          Payments are held in escrow and only released to the seller once you confirm you received the item.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {loading && (
          <div className="flex justify-center py-10 text-ink-faint">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}

        {!loading && error && <p className="text-center text-sm text-rose-600 py-8">{error}</p>}

        {!loading && !error && orders.length === 0 && (
          <div className="text-center py-14 px-8">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center mb-3">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <p className="font-bold text-ink">No orders yet</p>
            <p className="text-xs text-ink-mute mt-1">Buy something from the Marketplace and it will show up here.</p>
          </div>
        )}

        {!loading && !error && purchases.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold text-ink-faint uppercase tracking-wide px-0.5">Purchases</h2>
            {purchases.map(renderOrder)}
          </section>
        )}
        {!loading && !error && sales.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold text-ink-faint uppercase tracking-wide px-0.5">Sales</h2>
            {sales.map(renderOrder)}
          </section>
        )}
      </div>

      {confirming && (
        <div className="absolute inset-0 z-[90] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-base text-ink">Release the money?</h3>
            </div>
            <p className="text-[13px] text-ink-mute mt-2 leading-relaxed">
              Confirming receipt releases {formatMoney(confirming.amountCents, confirming.currency)} held in escrow
              to the seller. This cannot be undone, so only do it once you actually have the item.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setConfirming(null)}
                className="px-4 py-2.5 rounded-xl bg-paper-mist text-ink text-xs font-bold"
              >
                Not yet
              </button>
              <button
                onClick={() => void release(confirming)}
                disabled={busy === confirming.id}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-60"
              >
                {busy === confirming.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Yes, release it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
