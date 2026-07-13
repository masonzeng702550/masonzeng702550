---
title: "14天防疫假 Python×HTML×網頁爬蟲瘋狂教室 Day-07"
date: 2021-05-23 15:44:26
updated: 2021-05-23 15:44:26
categories:
  - 程式教學
tags:
  - Python
  - HTML
  - 爬蟲
cover: /images/4e497de8cfcd/img01.png
excerpt: "Hello,大家好我是梅森Mason，今天我要帶各位來分析HTML原始碼。"
comments: true
source: https://masonlifemaker.medium.com/4e497de8cfcd
---

Hello,大家好我是梅森Mason，今天我要帶各位來分析HTML原始碼。

首先，我們先把前天所爬回的原始碼檔案打開(還沒看過的點→[me](https://masonlifemaker.medium.com/14%E5%A4%A9%E9%98%B2%E7%96%AB%E5%81%87-python-html-%E7%B6%B2%E9%A0%81%E7%88%AC%E8%9F%B2%E7%98%8B%E7%8B%82%E6%95%99%E5%AE%A4-day-05-fc0dfb695058)←)

![※注意，文檔通常會和程式碼放在同一個資料夾內。](/images/4e497de8cfcd/img01.png)

接著，在原始碼中找尋有關於成語的內容，各位應該會找到以下內容，觀察一下，你發現了什麼？

![](/images/4e497de8cfcd/img02.png)

各位可能會發現成語摻雜在許多複雜的原始碼中，其實細心觀察後，你會發現，你面其實由許多像是這樣的標籤組成(看下一行)。

<標籤>內容</標籤>

你會發現，跟之前學得好像有幾分相似(還沒看過的點→[me](https://masonlifemaker.medium.com/14%E5%A4%A9%E9%98%B2%E7%96%AB%E5%81%87-python-html-%E7%B6%B2%E9%A0%81%E7%88%AC%E8%9F%B2%E7%98%8B%E7%8B%82%E6%95%99%E5%AE%A4-day-03-5e12010e6568)←)，在經過我的分析之後，每行原始碼之中只有成語這行有<div role=’cell’>這個標籤，因此排除其他行之後，只剩下有成語的這幾行，而每行都可以分為前後兩組原始碼(見下圖)。

![](/images/4e497de8cfcd/img03.png)

因此只要將後半部留下來，前半部刪除，而這點在<div role=’cell’>做得到。

![](/images/4e497de8cfcd/img04.png)

那剩下就只要將所有標籤刪除，明天就會教大家如何用程式刪除標籤囉！

希望這些課程能給各位讀者大大幫助，歡迎把本文轉發，讓更多人知道喲！

By [那個成天泡在電腦裡的梅森](https://medium.com/@masonlifemaker) on [May 23, 2021](https://medium.com/p/4e497de8cfcd).

[Canonical link](https://medium.com/@masonlifemaker/14%E5%A4%A9%E9%98%B2%E7%96%AB%E5%81%87-python-html-%E7%B6%B2%E9%A0%81%E7%88%AC%E8%9F%B2%E7%98%8B%E7%8B%82%E6%95%99%E5%AE%A4-day-07-4e497de8cfcd)
