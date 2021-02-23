import * as idb from "idb";
import {MigrationVersion} from '../migration/Migration'

/**
 * Wrapper de la biblioteca idb, posee una lista de métodos para simplificar el uso de la misma y una conexión
 * a indexeddb
 */
export class DB {

    /**
     * @typedef {string} EXTREMOS
     */

    /**
     * Enum para seleccionar hacia donde me dirijo con un cursor
     * @readonly
     * @enum {EXTREMOS}
     */
    static EXTREMOS = Object.freeze({
        /** El cursor apunta hacia el siguiente elemento */
        siguiente: 'next',
        /** El cursor apunta hacia el elemento anterior */
        anterior: 'prev'
    });

    /**
     * @typedef {string} TRANSACTION_MODE
     */

    /**
     * Enum para seleccionar el tipo de transacción
     * @readonly
     * @enum {TRANSACTION_MODE}
     */
    TRANSACTION_MODE = Object.freeze({
        /** Transacción en modo lectura */
        lectura: 'readonly',
        /** Transacción en modo lectoescritura */
        escritura: 'readwrite'
    });

    /** @type {IDBDatabase} */
    #_connection;
    /** @type {string} */
    #_nombre;
    /** @type {number} */
    #_version;
    /** @type {MigrationVersion[]} */
    #_migrations = [];

    /** @returns {IDBDatabase} */
    get #connection() {
        return this.#_connection;
    }

    set #connection(value) {
        this.#_connection = value;
    }

    /** @param {string} value */
    set #nombre(value) {
        this.#_nombre = value;
    }

    /** @returns {string} */
    get #nombre() {
        return this.#_nombre;
    }

    /** @returns {number} */
    get #version() {
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
     * Agrego una nueva migración a la db
     * @param {MigrationVersion} migration
     * @returns {DB}
     */
    addMigration(migration) {
        migration.version = this.#version;
        this.#version++;
        this.#_migrations.push(migration);
        return this;
    }

    /**
     * @param {string} table - tabla sobre la cual se abre la transacción
     * @param {IDBTransactionMode} mode - modo de la transacción(lectura o escritura)
     * @returns {IDBTransaction}
     */
    tx(table, mode) {
        return this.#connection.transaction(table, mode);
    }

    /**
     * Obtengo TODAS las entradas de una tabla dada
     * @param {string} table - tabla desde la cual obtener las entradas
     * @returns {Promise<*>}
     */
    getAll(table) {

        let tx = this.tx(table, this.TRANSACTION_MODE.lectura);
        return tx.store.getAll();
    }

    /**
     * Obtengo UNA entrada dada de una tabla dada y de un indice dado
     * @param {string} table - tabla desde la cual obtener entradas
     * @param {string} index - indice desde el cual consulto el id
     * @param {string|number} key - clave/id de la entrada
     * @returns {Promise<*>}
     */
    getByIndex(table, index, key) {

        return this.#connection.getFromIndex(table, index, key);
    }

    /**
     * Obtengo TODAS las entradas en una tabla dada que posean un indice y clave dados
     * @param {string} table - tabla desde la cual obtener entradas
     * @param {string} index - indice desde el cual consulto el id
     * @param {string|number} key - clave/id de las entradas
     * @returns {Promise<*>}
     */
    getAllFromIndex(table, index, key) {

        return this.#connection.getAllFromIndex(table, index, key);
    }

    /**
     * Obtengo un CURSOR dada una tabla y un índice
     * @param {string} table - tabla desde la cual obtener entradas
     * @param {string} index - indice desde el cual consulto el id
     * @param {IDBCursorDirection} [extreme=DB.extremos.siguiente] - hacia donde apunta el cursor, atrás o adelante
     * @returns {Promise<*>}
     */
    getAllFromIndexCursor(table, index, extreme = DB.EXTREMOS.siguiente) {

        let tx = this.tx(table, this.TRANSACTION_MODE.lectura);
        return tx.store.index(index).openCursor(null, extreme);
    }

    /**
     * Obtengo la MAXIMA entrada de una tabla según el indice dado
     * @param {string} table - tabla desde la cual obtener entradas
     * @param {string} index - indice desde el cual consulto el id
     * @returns {Promise<*>}
     */
    getMaxFromIndex(table, index) {

        return this.getAllFromIndexCursor(table, index, DB.EXTREMOS.anterior);
    }

    /**
     * Obtengo la MINIMA entrada de una tabla según el indice dado
     * @param {string} table - tabla desde la cual obtener entradas
     * @param {string} index - indice desde el cual consulto el id
     * @returns {Promise<*>}
     */
    getMinFromIndex(table, index) {

        return this.getAllFromIndexCursor(table, index, DB.EXTREMOS.siguiente);
    }

    /**
     * Obtengo cuantas entradas existen en cierta tabla
     * @param {string} table - tabla desde la cual contar entradas
     * @returns {Promise<*>} - esta es una promesa que retorna un numero, pero el ide se queja
     */
    count(table) {

        return this.#connection.count(table);
    }

    /**
     * Obtengo cuantas entradas existen en cierta tabla dado cierto indice y cierta clave
     * @param {string} table - tabla desde la cual obtener entradas
     * @param {string} index - indice desde el cual consulto el id
     * @param {string|number} key - clave/id de las entradas
     * @returns {Promise<*>} - esta es una promesa que retorna un numero, pero el ide se queja
     */
    countFromIndex(table, index, key) {

        return this.#connection.countFromIndex(table, index, key);
    }

    /**
     * Actualizo un objeto de una tabla dada
     * @param {Model} instance
     */
    update(instance) {

        return this.#connection.put(instance.table_name, instance);
    }

    /**
     * Remuevo un objeto dado de una tabla dada
     * @param {Model} instance
     */
    remove(instance) {

        return this.#connection.delete(instance.table_name, instance.id);
    }

    /**
     * Remuevo todas las entradas asociadas a una tabla dada
     * @param {string} table
     */
    clear(table) {

        return this.#connection.clear(table);
    }

    /**
     * Almaceno un array de un modelo dado
     * @param {string} table - tabla en la que se van a almacenar las instancias
     * @param {Model[]} array - array de elementos a almacenar
     */
    store(table, array) {
        let tx = this.tx(table, this.TRANSACTION_MODE.escritura);
        Promise.all(array.map(function (e) {
            return tx.store.add(e);
        }));
        return tx.done;
    }

    /**
     * @param {string} nombre - Nombre de la db a la cual conectarse
     * @param {number} [version=0] - Version inicial de la DB
     * @returns {DB}
     * @private
     */
    constructor(nombre, version = 0) {

        if (typeof nombre !== 'undefined') {
            this.#nombre = nombre;
            this.#version = version;
            return this;
        }
        throw new Error('Para instanciar una db necesito su nombre');
    }

    /**
     * Me conecto a la base de datos
     * @returns {Promise<void>}
     */
    async connect() {

        if (this.#migrations.length > 0) {

            let db = this;
            this.#connection = await idb.openDB(this.#nombre, this.#version, {
                upgrade(database, old_version, new_version, transaction) {
                    db.migrar(database, old_version, new_version, transaction);
                }
            });
            return;
        }
        throw new Error('No me asignaste ninguna migración.');
    }

    /**
     * Corro las migraciones
     * @param {IDBDatabase} db
     * @param {number} old_version
     * @param {number} new_version
     * @param {IDBTransaction} transaction
     */
    migrar(db, old_version, new_version, transaction) {
        for (let migration of this.#migrations) {

            if (old_version < migration.version - 1) {
                migration.run(db, transaction);
            }
        }
    }
}
