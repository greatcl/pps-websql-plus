function getDomainFromUrl(url){
     var host = "null";
     if(typeof url == "undefined" || null == url)
          url = window.location.href;
     var regex = /.*\:\/\/([^\/]*).*/;
     var match = url.match(regex);
     if(typeof match != "undefined" && null != match)
          host = match[1];
     return host;
}

function initial(tabId, changeInfo, tab) {
     if(getDomainFromUrl(tab.url).toLowerCase()=="websql.game.pps.tv"){
          chrome.pageAction.show(tabId);
     }
};

chrome.tabs.onUpdated.addListener(initial);

// replace codemirror resource with higher version
chrome.webRequest.onBeforeRequest.addListener(
     function(details) {
          cmJsUrl = "/codemirror/codemirror.js";
          cmCssUrl = "/codemirror/codemirror.css";
          iconUrl = "/favicon.ico";
          if( details.url == "http://websql.game.pps.tv/public/js/codemirror/codemirror.js" )
               return {redirectUrl: chrome.extension.getURL(cmJsUrl) };
          else if (details.url == "http://websql.game.pps.tv/public/css/codemirror/codemirror.css") {
               return {redirectUrl: chrome.extension.getURL(cmCssUrl)};
          } else if (details.url == "http://websql.game.pps.tv/imgs/favicon.ico") {
               return {redirectUrl: chrome.extension.getURL(iconUrl)};
          }
     }, {
          urls: ["<all_urls>"]
     },
     [ "blocking" ]
);