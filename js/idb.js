var RequestIDB = (function(){
    var RequestIDB = function(storeName){
        this.dbName = 'plus-websql';
        this.dbVersion = 1;
        this.storeName = storeName;
        this.db = null;
    };

    RequestIDB.prototype.initDb = function(){
        var self = this;
        var request = indexedDB.open(this.dbName, this.dbVersion);
        request.onsuccess = function(evt){
            self.db = this.result;
        };

        request.onerror = function(evt){
            console.error("initDB: ", evt.target.errorCode);
        };

        request.onupgradeneeded = function(evt){
            var store = evt.currentTarget.result.createObjectStore(
                self.storeName,
                {
                    keyPath : 'id',
                    autoIncrement : true
                });
            store.createIndex('timestamp', 'timestamp', {unique : false});
            store.createIndex('db', 'db', {unique: false});
            store.createIndex('star', 'star', {unique: false});
        };
    };

    RequestIDB.prototype.addRecord = function(db, sql, timestamp){
        if (!this.db){
            console.error("addRecord: the db is not initialized");
            return;
        }
        var tx = this.db.transaction(this.storeName, 'readwrite');
        var store = tx.objectStore(this.storeName);
        var request = store.add({
            db : db,
            sql : sql,
            timestamp : timestamp,
            star : 0
        });
        request.onsuccess = function(evt){
            // @todo add to html
            var id = evt.target.result;
            
            var toffset = (new Date()).getTimezoneOffset() * 60000;
            var date = new Date(timestamp - toffset).toISOString(),
                dateTime = date.substr(0, 10) + " " + date.substr(11, 8);
            var itemHtml = '<li recordId="' + id + '" class="history-sql-item">\
                                <ul>\
                                    <li class="history-sql-header">\
                                        <span class="history-sql-btn history-sql-star"></span>\
                                        <span class="history-sql-btn history-sql-delete" title="Delete"></span>\
                                        <span class="history-sql-btn history-sql-run" title="Run"></span>\
                                        <span class="history-sql-db">' + db + '</span>\
                                        <span class="history-sql-time">' + dateTime + '</span>\
                                    </li>\
                                    <li class="history-sql-body" title="DoubleClick Query">' + sql + '</li>\
                                </ul>\
                            </li>';
            $('#historyList').prepend(itemHtml);
        };
        request.onerror = function(){
            console.error("add error", this.error);
        };
    };

    RequestIDB.prototype.showHistory = function(dataType){
        if (!this.db){
            console.error("showHistory: the db is not initialized");
            return;
        }
        var tx = this.db.transaction(this.storeName, "readonly");
        var store = tx.objectStore(this.storeName);
        switch(dataType){
            case 'all':
                var request = store.openCursor();
                break;
            case 'stared':
                var boundKeyRange = IDBKeyRange.only(1);
                var request = store.index('star').openCursor(boundKeyRange);
                break;
            default:
                var request = store.openCursor();
        }
        
        var html = $('#historyList');
        html.empty();
        request.onsuccess = function(evt){
            var cursor = evt.target.result;
            if (cursor){
                var value = cursor.value;
                var toffset = (new Date()).getTimezoneOffset() * 60000;
                var date = new Date(value.timestamp - toffset).toISOString(),
                    dateTime = date.substr(0, 10) + " " + date.substr(11, 8);
                var starClass = '';
                if (value.star == 1){
                    starClass += ' stared';
                }
                var itemHtml = '<li recordId="' + value.id + '" class="history-sql-item' + starClass + '">\
                                    <ul>\
                                        <li class="history-sql-header">\
                                            <span class="history-sql-btn history-sql-star' + starClass + '"></span>\
                                            <span class="history-sql-btn history-sql-delete" title="Delete"></span>\
                                            <span class="history-sql-btn history-sql-run" title="Run"></span>\
                                            <span class="history-sql-db">' + value.db + '</span>\
                                            <span class="history-sql-time">' + dateTime + '</span>\
                                        </li>\
                                        <li class="history-sql-body" title="DoubleClick Query">' + value.sql + '</li>\
                                    </ul>\
                                </li>';
                html.prepend(itemHtml);
                cursor.continue();
            }
        };
    };

    // 收藏或取消收藏
    RequestIDB.prototype.star = function(id, status){
        if (status === false){
            var obj = {star : 0};
        } else {
            var obj = {star : 1};
        }
        this.updateRecord(id, obj);
    };

    RequestIDB.prototype.updateRecord = function(id, newValueObj){
        if(typeof newValueObj !== 'object'){
            console.warn("newValueObj is not an object");
            newValueObj = {};
        }
        var tx = this.db.transaction(this.storeName, "readwrite");
        var store = tx.objectStore(this.storeName);
        id = Number(id);

        var request = store.get(id);
        request.onsuccess = function(evt){
            var record = evt.target.result;
            if (typeof record != 'undefined'){
                for(var key in newValueObj){
                    record[key] = newValueObj[key];
                }
                request = store.put(record);
                request.onsuccess = function(evt){
                    console.debug("update record id: ", evt.target.result);
                    // @todo update html
                };
                request.onerror = function(evt){
                    console.error("update error: ", evt.target.errorCode);
                };
            } else {
                console.error("update error: No matching record found");
            }
        };

        request.onerror = function(evt){
            console.error("update: ", evt.target.errorCode);
        };
    };

    // delete one record by id
    RequestIDB.prototype.deleteRecord = function(id){
        if (!id){
            return;
        }
        var tx = this.db.transaction(this.storeName, "readwrite");
        var store = tx.objectStore(this.storeName);
        id = Number(id);

        var request = store.get(id);
        request.onsuccess = function(evt){
            var record = evt.target.result;
            if (typeof record !== 'undefined'){
                request = store.delete(id);
                request.onsuccess = function(evt){
                    // @todo delete from html
                    $('.history-sql-item[recordid="' + id + '"]').remove();
                };
                request.onerror = function(evt){
                    console.error("delete: ", evt.target.errorCode);
                };
            } else {
                console.error("delete error: No matching record found");
            }
        };
        request.onerror = function(evt){
            console.error("delete: ", evt.target.errorCode);
        };
    };

    return RequestIDB;
})();