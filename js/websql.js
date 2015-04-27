$("body").css({
    'font-family' : 'Consolas, Microsoft Yahei'
});
$('.layout-panel-west .panel-title').css({
    'color' : 'red',
    'font-size' : '13px'
});

// 插入js文件
var injectJs = function(link){
    var script = document.createElement('script');
    script.type = "text/javascript";
    script.src = link;
    (document.body || document.head || document.documentElement).appendChild(script);
};
injectJs(chrome.extension.getURL('/js/injected.js'));

// 插入css文件
var injectCss = function(link){
    var style = document.createElement('link');
    style.type = "text/css";
    style.href = link;
    style.rel = "stylesheet";
    (document.head || document.documentElement).appendChild(style);
};
injectCss(chrome.extension.getURL('/css/style.css'));

// save last selected database
var saveLastDb = function(dbName){
    localStorage.lastDbName = dbName;
};

// get last selected database
var getLastDb = function(){
    return localStorage.lastDbName;
};

$(function(){
    $('#db-tree li').on('click', function(){
        var dbName = $(this).find('.tree-title').html();
        saveLastDb(dbName);
        // display current db name
        $('.layout-panel-west .panel-title').html(dbName);
    });

    // select last db
    if (getLastDb){
        $('#db-tree .tree-title').filter(
            function(index){
                if (this.innerHTML == getLastDb()){
                    $('#db-tree').parent().scrollTop(18 * index);
                }
                return this.innerHTML == getLastDb();
            }
        ).trigger('click');
    }
});