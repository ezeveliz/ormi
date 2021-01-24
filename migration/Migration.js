import {Model} from "../model/Model";

export class MigrationVersion {

    #TYPE_OF_TASK = Object.freeze({
        add_table: 'add_table',
        remove_table: 'remove_index',
        add_index: 'add_index',
        remove_index: 'remove_index',
    });

    #_tasks = [];
    _version;

    get #tasks() {
        return this.#_tasks;
    }

    get version() {
        return this._version;
    }

    set version(value) {
        this._version = value;
    }

    /**
     * Agrego una nueva tabla con sus índices si los proporciona
     * @param {typeof Model|string} model
     * @param {string} [key='id']
     * @param {boolean} [autoincrement=true]
     * @param {string[]} [indexes=[]]
     */
    addTable(model, key = 'id', autoincrement = true, indexes = []) {

        if (model.prototype instanceof Model) {
            model.indexes = indexes;
        }

        let task = {};

        task.type = this.#TYPE_OF_TASK.add_table;
        task.table = MigrationVersion.getTable(model);

        task.key = key;
        task.autoincrement = autoincrement;
        task.indexes = indexes;

        this.#_tasks.push(task);
    }

    /**
     * Agrego indices a una tabla ya existente
     * @param {typeof Model|string} model
     * @param {string[]} [indexes=[]]
     */
    addIndexes(model, indexes = []) {
        if (model.prototype instanceof Model) {
            model.indexes = model.indexes.concat(indexes);
        }

        let task = {};

        task.type = this.#TYPE_OF_TASK.add_index;
        task.table = MigrationVersion.getTable(model);
        task.indexes = indexes;

        this.#_tasks.push(task);
    }

    /**
     * Quito indices a una tabla ya existente
     * @param {typeof Model|string} model
     * @param {string[]} [indexes=[]]
     */
    removeIndexes(model, indexes = []) {
        if (model.prototype instanceof Model) {
            model.indexes = model.indexes.filter(i => !indexes.includes(i));
        }

        let task = {};

        task.type = this.#TYPE_OF_TASK.remove_index;
        task.table = MigrationVersion.getTable(model);
        task.indexes = indexes;

        this.#_tasks.push(task);
    }

    /**
     *
     * @param {typeof Model|string} model
     * @returns {string}
     */
    static getTable(model) {
        if (model.prototype instanceof Model) {
            return model.table_name;
        } else {
            return model;
        }
    }

    /**
     * Corro todas las tareas de la version
     * @param {IDBDatabase} db
     * @param {IDBTransaction} transaction
     */
    run(db, transaction) {

        let table;

        for (let task of this.#tasks) {

            switch (task.type) {
                case (this.#TYPE_OF_TASK.add_table):

                    table = db.createObjectStore(task.table, {
                        keyPath: '_' + task.key,
                        autoIncrement: task.autoincrement,
                    });

                    table.createIndex(task.key, '_' + task.key);
                    for (let index of task.indexes) {
                        table.createIndex(index, '_' + index);
                    }
                    break;
                case (this.#TYPE_OF_TASK.add_index):

                    table = transaction.objectStore(task.table);

                    for (let index of task.indexes) {
                        table.createIndex(index, '_' + index);
                    }
                    break;
                case (this.#TYPE_OF_TASK.remove_index):

                    table = transaction.objectStore(task.table);

                    for (let index of task.indexes) {
                        table.deleteIndex(index);
                    }
                    break;
            }
        }
    }
}
