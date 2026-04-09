# Hover to Speak

極簡 Chrome Extension，用於英文聽力練習。按住 Alt 進入模式後，滑鼠移到哪、點到哪，網頁就念到哪。主要在 claude.ai 使用，但支援所有網站。

## 安裝

1. 下載或 clone 本專案到本機
2. 開啟 Chrome，網址列輸入 `chrome://extensions/`
3. 右上角開啟「開發人員模式」
4. 點「載入未封裝項目」
5. 選擇 `hover-to-speak/` 資料夾
6. 完成，不需要重新載入已開啟的分頁（新分頁才會注入，舊分頁需 F5）

## 操作

進入模式後，游標會變成十字（crosshair），滑鼠經過的元素會出現橘色外框。

| 操作 | 行為 |
|---|---|
| 按住 Alt | 進入臨時模式，放開 Alt 離開 |
| 快速連按兩次 Alt（200ms 內） | 進入鎖定模式，不用一直按著 |
| 按住 Alt + 點擊元素 | 念整段並直接進入鎖定模式 |
| 鎖定模式下再按一次 Alt | 解除鎖定 |
| Hover 元素 300ms | 自動念整段 |
| Click 元素 | 立即念整段 |
| Shift + Click | 只念點擊位置所在的那一句 |
| 切到別的視窗 | 自動離開模式 |

語音設定：`en-US`、語速 `0.85`。每次觸發前會打斷上一段，不會疊音。

## 不會攔截的區域

點到 `input`、`textarea`、`[contenteditable]` 時不會被攔截，可正常打字。這讓你可以在 claude.ai 輸入框正常輸入，同時在對話內容上做聽力練習。

## 已知限制

- **Shadow DOM**：封閉 shadow root 內的元素抓不到
- **iframe**：跨 origin 的 iframe 無法注入
- **部分網站 CSP**：極少數站點會擋 content script
- **瀏覽器 TTS 品質**：使用系統 `speechSynthesis`，音質依作業系統而定（macOS 建議到「系統設定 → 輔助使用 → 語音內容」下載高品質英文語音）
- **句子切割**：用簡易 regex `[.!?]` 判斷邊界，遇到縮寫（Mr. Dr.）可能切錯

## 檔案結構

```
hover-to-speak/
├── manifest.json   # MV3 設定
├── content.js      # 全部邏輯都在這
└── README.md
```

沒有 background script、沒有 popup、沒有 options page。單檔即完整。
