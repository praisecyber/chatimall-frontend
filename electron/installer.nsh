!define MUI_WELCOMEPAGE_TITLE "Welcome to Chatimall Setup"
!define MUI_WELCOMEPAGE_TEXT "This wizard will guide you through installing Chatimall on your computer.$\r$\n$\r$\nBring voice notes, live rooms, and your people together in one place.$\r$\n$\r$\nClick Next to continue."
!define MUI_FINISHPAGE_TITLE "Chatimall is ready to go"
!define MUI_FINISHPAGE_TEXT "Chatimall has been installed on your computer.$\r$\n$\r$\nClick Finish to close Setup. You can launch Chatimall from the desktop shortcut."
!define MUI_FINISHPAGE_RUN_TEXT "Launch Chatimall"

!macro customWelcomePage
  !insertmacro MUI_PAGE_WELCOME
!macroend
