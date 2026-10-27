package com.chatimall.app;

import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.tiktok.open.sdk.core.appcheck.ITikTokAppCheck;
import com.tiktok.open.sdk.core.appcheck.TikTokAppCheckUtil;
import com.tiktok.open.sdk.share.Format;
import com.tiktok.open.sdk.share.MediaType;
import com.tiktok.open.sdk.share.ShareApi;
import com.tiktok.open.sdk.share.ShareRequest;
import com.tiktok.open.sdk.share.model.MediaContent;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@CapacitorPlugin(name = "TikTokShare")
public class TikTokSharePlugin extends Plugin {
    private static final String SHARE_RESULT_EVENT = "shareResult";
    private static final int MAX_MEDIA_ITEMS = 35;

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject status = new JSObject();
        status.put("configured", !BuildConfig.TIKTOK_CLIENT_KEY.isEmpty());
        status.put("tiktokInstalled", installedTikTokPackage() != null);
        call.resolve(status);
    }

    @PluginMethod
    public void shareMedia(PluginCall call) {
        if (BuildConfig.TIKTOK_CLIENT_KEY.isEmpty()) {
            call.reject("TikTok Share Kit is not configured in this Android build.", "TIKTOK_NOT_CONFIGURED");
            return;
        }
        if (installedTikTokPackage() == null) {
            call.reject("Install TikTok on this device before sharing.", "TIKTOK_NOT_INSTALLED");
            return;
        }

        Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        picker.setType("*/*");
        picker.putExtra(Intent.EXTRA_MIME_TYPES, new String[] { "image/*", "video/mp4" });
        picker.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        picker.addCategory(Intent.CATEGORY_OPENABLE);
        startActivityForResult(call, picker, "handleMediaPickerResult");
    }

    @ActivityCallback
    private void handleMediaPickerResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("Media selection was cancelled.", "MEDIA_SELECTION_CANCELLED");
            return;
        }
        String tiktokPackage = installedTikTokPackage();
        if (tiktokPackage == null) {
            call.reject("Install TikTok on this device before sharing.", "TIKTOK_NOT_INSTALLED");
            return;
        }

        Intent data = result.getData();
        List<Uri> selectedUris = new ArrayList<>();
        ClipData clipData = data.getClipData();
        if (clipData != null) {
            for (int i = 0; i < clipData.getItemCount(); i++) {
                selectedUris.add(clipData.getItemAt(i).getUri());
            }
        } else if (data.getData() != null) {
            selectedUris.add(data.getData());
        }

        if (selectedUris.isEmpty() || selectedUris.size() > MAX_MEDIA_ITEMS) {
            call.reject("Choose between 1 and 35 photos or videos.", "INVALID_MEDIA_COUNT");
            return;
        }

        String firstMime = getContext().getContentResolver().getType(selectedUris.get(0));
        if (firstMime == null) {
            call.reject("The selected media type could not be identified.", "UNSUPPORTED_MEDIA_TYPE");
            return;
        }
        boolean sharingImages = firstMime.toLowerCase(Locale.ROOT).startsWith("image/");
        if (!sharingImages && !"video/mp4".equalsIgnoreCase(firstMime)) {
            call.reject("TikTok Share Kit accepts photos or MP4 videos.", "UNSUPPORTED_MEDIA_TYPE");
            return;
        }
        if (sharingImages && selectedUris.size() < 2) {
            call.reject("Select at least 2 photos to create a TikTok photo post.", "INSUFFICIENT_PHOTOS");
            return;
        }

        ArrayList<String> mediaPaths = new ArrayList<>();
        for (Uri uri : selectedUris) {
            String mime = getContext().getContentResolver().getType(uri);
            if (mime == null || (sharingImages ? !mime.toLowerCase(Locale.ROOT).startsWith("image/") : !"video/mp4".equalsIgnoreCase(mime))) {
                call.reject("Select media of one supported type at a time.", "MIXED_OR_UNSUPPORTED_MEDIA");
                return;
            }
            mediaPaths.add(uri.toString());
            getContext().grantUriPermission(tiktokPackage, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        }

        MediaType mediaType = sharingImages ? MediaType.IMAGE : MediaType.VIDEO;
        ShareRequest request = new ShareRequest(
            BuildConfig.TIKTOK_CLIENT_KEY,
            new MediaContent(mediaType, mediaPaths),
            Format.DEFAULT,
            getContext().getPackageName(),
            MainActivity.class.getName()
        );
        boolean launched = new ShareApi(getActivity()).share(request);
        if (!launched) {
            call.reject("TikTok could not open the selected media. Try again or choose different files.", "TIKTOK_SHARE_FAILED");
            return;
        }

        JSObject response = new JSObject();
        response.put("opened", true);
        response.put("mediaType", sharingImages ? "IMAGE" : "VIDEO");
        response.put("mediaCount", mediaPaths.size());
        call.resolve(response);
    }

    private String installedTikTokPackage() {
        ITikTokAppCheck installedApp = TikTokAppCheckUtil.INSTANCE.getInstalledTikTokApp(getContext());
        return installedApp == null ? null : installedApp.getAppPackageName();
    }

    public void handleShareResult(Intent intent) {
        com.tiktok.open.sdk.share.ShareResponse response = new ShareApi(getActivity()).getShareResponseFromIntent(intent);
        if (response == null) return;

        JSObject result = new JSObject();
        result.put("success", response.getErrorCode() == 0);
        result.put("errorCode", response.getErrorCode());
        result.put("subErrorCode", response.getSubErrorCode());
        result.put("message", response.getErrorMsg() == null ? "" : response.getErrorMsg());
        notifyListeners(SHARE_RESULT_EVENT, result, true);
    }
}
