import {Model} from "../model/Model";

export class Migration {

    /** @type {string} */
    #_name;
    /** @type {number} */
    #_version;
    /** @type {MigrationVersion[]} */
    #_migrations = [];

    /** @param {string} value */
    set #name(value) {
        this.#_name = value;
    }

    /** @returns {number} */
    get version() {
        return this.#_version;
    }

    /** @param {number} value */
    set #version(value) {
        this.#_version = value;
    }

    /** @returns {MigrationVersion[]} */
    get #migrations() {
        return this.#_migrations;
    }

    /**
     * @param {number} version
     * @returns {Migration}
     */
    constructor(version) {
        this.#version = version;
        return this;
    }

    /**
     * Agrego una nueva version a la migracion
     * @param {MigrationVersion} migration
     * @returns {Migration}
     */
    add(migration) {
        migration.version = this.version;
        this.#version = this.version + 1;
        this.#_migrations.push(migration);
        return this;
    }

    /**
     * Corro las migraciones
     * @param {IDBDatabase} db
     * @param {number} oldVersion
     * @param {number} newVersion
     * @param {IDBTransaction} transaction
     */
    run(db, oldVersion, newVersion, transaction) {
        for (let migration of this.#migrations) {

            if ( oldVersion < migration.version ) {
                migration.run(db, transaction);
            }
        }
    }
}

export class MigrationVersion {

    #TYPE_OF_TASK = Object.freeze({
        new_table: 'new_table',
        new_index: 'new_index',
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
     * Agrego una nueva tabla con sus indices si los proporciona
     * @param {typeof Model|string} model
     * @param {string} [key='id']
     * @param {boolean} [autoincrement=true]
     * @param {string[]} [indexes=[]]
     */
    newTable(model, key = 'id', autoincrement = true, indexes = []) {
        let task = {};

        task.type = this.#TYPE_OF_TASK.new_table;
        if (model.prototype instanceof Model) {
            task.table = model.table;
        } else {
            task.table = model;
        }

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
    newIndexes(model, indexes = []) {
        let task = {};

        task.type = this.#TYPE_OF_TASK.new_index;
        if (model.prototype instanceof Model) {
            task.table = model.table;
        } else {
            task.table = model;
        }
        task.indexes = indexes;

        this.#_tasks.push(task);
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
                case (this.#TYPE_OF_TASK.new_table):

                    table = db.createObjectStore(task.table, {
                        keyPath: '_' + task.key,
                        autoIncrement: task.autoincrement,
                    });

                    table.createIndex(task.key, '_' + task.key);
                    for (let index of task.indexes) {
                        table.createIndex(index, '_' + index);
                    }
                    break;
                case (this.#TYPE_OF_TASK.new_index):

                    table = transaction.objectStore(task.table);

                    for (let index of task.indexes) {
                        table.createIndex(index, '_' + index);
                    }
                    break;
            }
        }
    }
}