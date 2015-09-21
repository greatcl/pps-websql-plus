var RequestIDB = (function(){
    var RequestIDB = function(storeName){
        this.dbName = 'plus-websql';
        this.dbVersion = 2;
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
            console.error("initDB: ", evt.target.error);
        };

        request.onupgradeneeded = function(evt){
            if (evt.currentTarget.transaction.db.objectStoreNames.contains(self.storeName)){
                var store = evt.currentTarget.transaction.objectStore(self.storeName);
                //evt.currentTarget.transaction.db.deleteObjectStore(self.storeName);
            } else {
                // nothing to do
                var store = evt.currentTarget.result.createObjectStore(self.storeName,{
                    keyPath : 'id',
                    autoIncrement : true
                });
            }
            // delete already exist keys
            var existIndexes = store.indexNames;
            for(var i in existIndexes){
                if (existIndexes.hasOwnProperty(i) && !isNaN(i)){
                    store.deleteIndex(existIndexes[i]);
                }
            }

            var indexs = {
                'db_sql' : {
                    'cols' : ['db', 'sql'],
                    'prop' : {unique : false}
                },
                'star_key' : {
                    'cols' : ['star', 'timestamp'],
                    'prop' : {unique : false}
                },
                'timestamp' : {
                    'cols' : ['timestamp'],
                    'prop' : {unique : false}
                }
            };
            for (var indexName in indexs){
                if (!store.indexNames.contains(indexName)){
                    store.createIndex(indexName, indexs[indexName]['cols'], indexs[indexName]['prop']);
                }
            }
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
            star : 0,
            query_count : 1
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

    RequestIDB.prototype.addUniqueRecord = function(db, sql, timestamp){
        if (!this.db){
            console.error('addUniqueRecord: the db is not initialized');
            return;
        }
        var self = this;
        var tx = this.db.transaction(this.storeName, 'readonly');
        var store = tx.objectStore(this.storeName);
        var boundKeyRange = IDBKeyRange.only([db, sql]);
        var request = store.index('db_sql').count(boundKeyRange);

        request.onsuccess = function(evt){
            if (evt.target.result > 0){
                if (evt.target.result == 1){
                    self.updateQueryCount(db, sql, timestamp);
                }
            } else {
                self.addRecord(db, sql, timestamp);
            }
        };
    };

    RequestIDB.prototype.formatTime = function(timestamp){
        var toffset = (new Date()).getTimezoneOffset() * 60000;
        var date = new Date(timestamp - toffset).toISOString(),
            dateTime = date.substr(0, 10) + " " + date.substr(11, 8);
        return dateTime;
    };

    RequestIDB.prototype.updateQueryCount = function(db, sql, timestamp){
        if (!this.db){
            console.error('updateQueryTimes: the db is not initialized');
            return;
        }
        var self = this;
        var tx = this.db.transaction(this.storeName, 'readonly');
        var store = tx.objectStore(this.storeName);
        var boundKeyRange = IDBKeyRange.only([db, sql]);
        var request = store.index('db_sql').openCursor(boundKeyRange);

        request.onsuccess = function(evt){
            var record = evt.target.result;
            if (record){
                var value = record.value;
                var recordId = value.id,
                    query_count = value.query_count;
                self.updateRecord(recordId, {'query_count': query_count + 1, 'timestamp' : timestamp});
                var sqlItem = $('.history-sql-item[recordid="' + recordId + '"]');
                sqlItem.remove();
                sqlItem.find('.history-sql-time').html(self.formatTime(timestamp));
                $('#historyList').prepend(sqlItem);
            }
        };
    };

    RequestIDB.prototype.cleanRepeatHistory = function(){
        if (!this.db){
            console.error("cleanRepeatHistory: the db is not initialized");
            return;
        }
        var self = this;
        var tx = this.db.transaction(this.storeName, "readonly");
        var store = tx.objectStore(this.storeName);
        var boundKeyRange = IDBKeyRange.lowerBound(0);
        var request = store.index('timestamp').openCursor(boundKeyRange);
        var deletedIds = [];

        request.onsuccess = function(evt){
            var record = evt.target.result;
            if (record){
                var value = record.value;
                var recordId = value.id,
                    db = value.db,
                    sql = value.sql,
                    timestamp = value.timestamp;
                var keyRange = IDBKeyRange.only([db, sql]);
                var dbSqlResult = store.index('db_sql').openCursor(keyRange);
                dbSqlResult.onsuccess = function(newEvt){
                    var dbSqlRecord = newEvt.target.result;
                    if (dbSqlRecord){
                        var dbSqlValue = dbSqlRecord.value;
                        if (dbSqlValue.id != recordId && dbSqlValue.timestamp < timestamp && deletedIds.indexOf(dbSqlValue.id) == -1){
                            self.deleteRecord(dbSqlValue.id);
                            deletedIds.push(dbSqlValue.id);
                            record.continue();
                        } else {
                            dbSqlRecord.continue();
                        }
                    } else {
                        record.continue();
                    }
                };
            }
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
                var boundKeyRange = IDBKeyRange.lowerBound(0);
                var request = store.index('timestamp').openCursor(boundKeyRange);
                break;
            case 'stared':
                var boundKeyRange = IDBKeyRange.lowerBound([1, 0]);
                var request = store.index('star_key').openCursor(boundKeyRange);
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