var idb;
// 历史记录收藏按钮点击事件
$(document).on('click', '.history-sql-star', function(){
    $(this).toggleClass('stared');
    var recordItem = $(this).parent().parent().parent();
    recordItem.toggleClass('stared');
    if (recordItem.hasClass('stared')){
        idb.star(recordItem.attr('recordId'));
    } else {
        idb.star(recordItem.attr('recordId'), false);
    }
});

// 历史记录tab页点击切换事件
$(document).on('click', '.history-tab', function(){
    $('.history-tab').removeClass('cur');
    $(this).addClass('cur');
    var dataType = $(this).attr('dataType');
    localStorage.currentHistoryTab = dataType;
    idb.showHistory(dataType);
});

// 历史记录删除按钮点击事件
$(document).on('click', '.history-sql-delete', function(){
    var recordItem = $(this).parent().parent().parent();
    idb.deleteRecord(recordItem.attr('recordId'));
});

// 历史记录sql语句双击事件
$(document).on('dblclick', '.history-sql-body', function(){
    var sql = $(this).text();
    var db = $(this).siblings('.history-sql-header').find('.history-sql-db').html();

    $('#db-tree .tree-title').filter(
        function(index){
            return this.innerHTML == db;
        }
    ).trigger('click');

    var editor = getCurrentCM(getCurrentTabIndex());
    editor.setValue(sql);
    $('#sql-query-btn').trigger('click');
    $('#historyPanel').hide();
});

// 点击执行按钮
$(document).on('click', '.history-sql-run', function(){
    var sql = $(this).parent().siblings('.history-sql-body').text();
    var db = $(this).siblings('.history-sql-db').html();
    $('#db-tree .tree-title').filter(
        function(index){
            return this.innerHTML == db;
        }
    ).trigger('click');

    var editor = getCurrentCM(getCurrentTabIndex());
    editor.setValue(sql);
    $('#sql-query-btn').trigger('click');
    $('#historyPanel').hide();
});

var bindEvent = function(){
    // data table tree event
    $("#table-tree").tree({
        onLoadSuccess : function(){
            $('#table-tree').off('click dblclick contextmenu', 'li');

            // double click table name to get table structure
            $('#table-tree').on('dblclick', 'li', function(){
                var tableName = $(this).find('.tree-title').html();
                var sql = "show full columns from " + tableName;
                var editor = getCurrentCM(getCurrentTabIndex());
                editor.undo();
                editor.setValue(sql);
                $('#sql-query-btn').trigger('click');
            });

            // single click to insert table name to editor
            $('#table-tree').on('click', 'li', function(e){
                var tableName = $(this).find('.tree-title').html();
                var editor = getCurrentCM(getCurrentTabIndex());
                // editor.setValue(sql);
                editor.replaceSelection(tableName + " ");
                editor.focus();
            });
            
            // right click to simple select some data
            $('#table-tree').on('contextmenu', 'li', function(e){
                e.preventDefault();
                var tableName = $(this).find('.tree-title').html();
                var sql = "select * from " + tableName + " LIMIT 0, 20";
                var editor = getCurrentCM(getCurrentTabIndex());
                editor.setValue(sql);
                editor.focus();
                $('#sql-query-btn').trigger('click');
            });
        }
    });

    $("#result-grid").datagrid({
        'onLoadSuccess' : function(data){
            $($("#result-grid").parents('div[region="center"]')[0]).show();

            var columnFileds = $('#result-grid').datagrid('getColumnFields');

            var colOpt = [];
            for(var idx in columnFileds){
                var column = columnFileds[idx];
                var opt = {
                    field : column,
                    title : column,
                    width : 120
                };
                colOpt.push(opt);
            }

            // todo
            var currentTabResult = getStorageSqlResult(getCurrentTabIndex());
            if (!currentTabResult){
                // set current query result to session storage
                setStorageSqlResult({
                    'colOpt' : colOpt,
                    'data' : data
                }, getCurrentTabIndex());

                //$('#result-grid').datagrid({
                //    columns : colOpt
                //}).datagrid('loadData', data);
            } else {
                // set current query result to session storage
                setStorageSqlResult({
                    'colOpt' : colOpt,
                    'data' : data
                }, getCurrentTabIndex());
            }
        }
    });

    // something do when click ok button before the query send
    $('#sql-query-btn').bindFirst('click', function(){
        var sql = getCurrentCM(getCurrentTabIndex()).getValue(),
            currentDb = localStorage.lastDbName,
            timestamp = new Date().getTime();
        originCM().setValue(sql);
        if (sql && currentDb){
            idb.addUniqueRecord(currentDb, sql, timestamp);
        }
    });
};

$.fn.bindFirst = function(name, fn) {
    // bind as you normally would
    // don't want to miss out on any jQuery magic
    this.bind(name, fn);
    var handlers = $._data(this[0], "events")[name];
    // take out the handler we just inserted from the end
    var handler = handlers.splice(handlers.length - 1)[0];
    // move it at the beginning
    handlers.splice(0, 0, handler);
};

// calculate object's size
Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

// get current selected tab index
var getCurrentTabIndex = function(){
    var tab = $('#sqlEditorTitle').tabs('getSelected');
    var index = $('#sqlEditorTitle').tabs('getTabIndex',tab);
    return index;
};

// remove cm editor by tab index when close tab
var removeCMByTabIndex = function(tabIndex){
    var cm = getCurrentCM(tabIndex);
    $(cm.getWrapperElement()).remove();
};

// get all cms' count
var getCMSize = function(){
    var cms = $('.CodeMirror');
    return cms.size();
};

// get current cm instance by tab index
var getCurrentCM = function(index){
    var cmIndex = getCMSize() - index - 2;
    if (cmIndex < 0){
        return undefined;
    }
    return getCM(cmIndex);
};

// get cm editor instance
var getCM = function(index){
    var cms = $('.CodeMirror');
    if (cms.hasOwnProperty(index)){
        return cms[index].CodeMirror;
    }
    return undefined;
};

// display or hide cm editor
var showCM = function(cm, status){
    if (status === false){
        $(cm.getWrapperElement()).hide();
    } else {
        $(cm.getWrapperElement()).show();
    }
};

// get origin cm editor created by the origin page
var originCM = function(){
    return getCM(getCMSize() - 1);
};

// get the sql result in sessionStorage
// if param index not be passed, return all result.
var getStorageSqlResult = function(index){
    var storageSQLResult = JSON.parse(sessionStorage['sqlResult']);
    if (index !== undefined){
        return storageSQLResult[index];
    }
    return storageSQLResult;
};

// set sql result to sessionStorage
var setStorageSqlResult = function(data, index){
    var storageSQLResult = getStorageSqlResult();
    storageSQLResult[index] = data;
    sessionStorage['sqlResult'] = JSON.stringify(storageSQLResult);
};

var createTabPanel = function(){
    var editorTitle = $('#sql-editor').parents('.layout-panel-center').find('.layout-panel-north .panel-header');
    editorTitle.after('<div id="tab-tools"><a id="addTabBtn"></a></div>');
    editorTitle.empty();
    editorTitle.attr({
        'id' : 'sqlEditorTitle',
        'class' : 'easyui-tabs'
    });
    editorTitle.html("");

    // hide the initial cm editor created by the origin page
    showCM(originCM(), false);

    // make tab
    $('#sqlEditorTitle').tabs({
        tools : '#tab-tools',
        tabWidth : 122,
        width : parseInt($('#sql-query-btn').parent().parent().css('left')) + 56,
        onAdd : function(title, index){
            console.log(index, title);
            // new codemirror instance
            var $textArea = $("<textarea id='sql-editor-" + index + "'></textarea>");
            $('#sql-editor').after($textArea);
            CodeMirror.fromTextArea(document.getElementById("sql-editor-"+index), {
                mode: "text/x-mysql",
                indentWithTabs: true,
                smartIndent: true,
                matchBrackets: true,
                autofocus: true,
                extraKeys: {
                    'F8' : function(editor){
                        $('#sql-query-btn').trigger('click');
                    },
                    'Ctrl-R' : function(){
                        $('#sql-query-btn').trigger('click');
                    }
                }
            });
            if (getCMSize() == 2){
                $('#sqlEditorTitle').tabs('update', {
                    tab : $('#sqlEditorTitle').tabs('getTab', 0),
                    options : {
                        closable : false
                    }
                });
            } else {
                $('#sqlEditorTitle').tabs('update', {
                    tab : $('#sqlEditorTitle').tabs('getTab', 0),
                    options : {
                        closable : true
                    }
                });
            }
        },
        onSelect : function(title, index){
            console.log("onSelect ", title, "index", index);
            var currentCm = getCurrentCM(index);
            showCM(currentCm);
            currentCm.focus();

            // load data
            var currentTabResult = getStorageSqlResult(index);
            if (!currentTabResult){
                $($("#result-grid").parents('div[region="center"]')[0]).hide();
            } else {
                $('#result-grid').datagrid({
                    columns : [currentTabResult['colOpt']]
                }).datagrid('loadData', currentTabResult['data']['rows']);
            }
            
            console.log(currentTabResult);
        },
        onUnselect : function(title, index){
            console.log("onUnselect ", title, "index", index);
            // hide this cm editor
            showCM(getCurrentCM(index), false);
        },
        onClose : function(title, index){
            console.log("onClose ", title, "index", index);
            removeCMByTabIndex(index);
            if (getCMSize() == 2){
                $('#sqlEditorTitle').tabs('update', {
                    tab : $('#sqlEditorTitle').tabs('getTab', 0),
                    options : {
                        closable : false
                    }
                });
            }
        }
    });

    // make linkbutton
    $('#addTabBtn').linkbutton({
        iconCls:'icon-add',
        plain:true
    }).on('click', function(){
        $('#sqlEditorTitle').tabs('add', {
            'title' : 'Just Write SQL',
            'closable' : true
        });
    });

    editorTitle.css({

    });
    $('#sqlEditorTitle .tabs-panels').css({
        'border-bottom' : 'none'
    });
    $('#sql-editor').parents('.panel-body.panel-body-noheader.layout-body').css({
        'border-top' : 'none'
    });
};

var defaultTab = function(){
    if (!localStorage.currentHistoryTab || localStorage.currentHistoryTab == 'all'){
        $('#historyAllBtn').trigger('click');
    } else {
        $('#historyStaredBtn').trigger('click');
    }
};

$(function(){
    sessionStorage["sqlResult"] = JSON.stringify([]);
    createTabPanel();
    $('#addTabBtn').trigger('click');

    var idbStoreName = 'query-history';

    setTimeout(function(){
        idb = new RequestIDB(idbStoreName);
        idb.initDb();
        setTimeout("defaultTab()", 800);
        bindEvent();
        if (!localStorage.alreadyCleanRepeatHistory){
            setTimeout(function(){
                idb.cleanRepeatHistory();
                localStorage.alreadyCleanRepeatHistory = 1;
            }, 1000);
        }
    }, 200);
});

/*
Local Storage变量说明
currentHistoryTab 历史记录面板当前标签页
lastDbName 最近一次使用的数据库名称
*/