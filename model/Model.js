import {DB} from "../db/DB";

/**
 * Objeto que contiene información sobre las distintas clases, un método para registrar una clase, otro para
 * obtener una clase y otro para limpiar las tablas asociadas a las clases registradas
 */
let MetaData = {
    /**
     * Objeto que mapea una clase con su nombre correspondiente
     * @type {Map<string, typeof Model>}
     */
    clases: new Map(),
    /**
     * Registro una clase dada en mi lista de clases
     * @param {typeof Model} clase - Clase a registrar
     * @throws {Error} Revolea un error si la clase que extiende no tiene definida la propiedad estática table
     * o si no extiende a Model.
     */
    registerClass: function (clase) {
        if (clase.prototype instanceof Model) {
            if (typeof clase.table !== 'undefined' && clase.table.localeCompare('Model') !== 0) {
                this.clases.set(clase.name, clase);
            } else {
                throw new Error('La clase debe sobreescribir la propiedad estática table');
            }
        } else {
            throw new Error('La clase a registrar debe extender la clase base Model');
        }
    },
    /**
     * Obtengo el constructor de una clase dado su nombre
     * @param {string} name - nombre de la clase a obtener
     * @returns {typeof Model} - modelo obtenido {@link Model}
     */
    getClass: function (name) {
        return this.clases.get(name);
    },
    /**
     * Vacío todas las tablas asociadas a las clases que se hayan registrado
     * @returns {Promise<void>}
     */
    cleanAll: async function () {
        for (let clase of this.clases.values()) {
            await clase.clean();
        }
    },
    /**
     * Seteo la db en todas las clases que heredan de Model
     * @param {DB} db - DB
     * @throws {Error} - Revolea un error si la db proporcionada no es una instancia de la clase DB.
     */
    setDB: function (db) {
        if (db !== null && db instanceof DB) {
            for (let clase of this.clases.values()) {
                clase.db = db;
            }
        } else {
            throw new Error('La DB proporcionada debe ser una instancia de la clase DB.');
        }
    }
};

/**
 * Clase que debera ser extendida por todas las clases que quieran trabajar sobre indexedDB
 */
class Model {

    static _db;

    // Id con el que se almacena una entrada dada en la db
    get id() {
        return this._id;
    }

    set id(value) {
        this._id = parseInt(value);
    }

    /**
     * * Si llamo este método desde la clase Model, seteo la db para todas las clases que la extiendan que esten
     * registradas.
     * * Si llamo este método desde una clase que extienda Model, solo seteo la db para esta.
     * @param {DB} db - DB a la cual conectarme
     * @throws {Error} - Revolea un error si la db proporcionada no es una instancia de DB
     */
    static set db(db) {

        if (db !== null && db instanceof DB) {
            if (this.name === 'Model') {
                MetaData.setDB(db);
                this._db = db;
                return;
            }
            if (this.prototype instanceof Model) {
                this._db = db;
            } else {
                throw new Error('No se que es esto pero no va a funcionar si no extendes de la clase Model o no sos la clase Model.');
            }
        } else {
            throw new Error('La DB proporcionada debe ser una instancia de la clase DB.');
        }

    }

    /**
     * @returns {DB}
     * @throws {Error} - Revoleo un error si no esta seteada la db, hacerlo con el método estático .db del Model
     * o de cualquier clase que lo extienda, o con el método estático .setDB para conexiones temporales.
     * */
    static get db() {
        if (typeof this._db !== 'undefined') {
            return this._db;
        }
        throw new Error('Si no se setea la db de la clase, no se podrá persistir ninguna instancia de la misma.');
    }

    /**
     * Creo una clase idéntica a la original pero con la db asociada modificada y retorno la misma
     * @param {DB} db - nueva DB
     * @returns {typeof Model} - Clase que extiende al modelo con la db asociada modificada
     * @throws {Error} - Revoleo un error si la db proporcionada no es una instancia de DB
     */
    static setDB(db) {

        if (db !== null && db instanceof DB) {

            /**
             * Hago una deep copy(copia profunda) de la clase original, al hacerlo puedo modificar la db
             * asignada a la clase sin modificar la db asignada a la clase original.
             * @type {typeof Model}
             */
            let copy = Object.create(this);
            // Modifico la db de la copia
            copy.db = db;
            // Retorno la copia
            return copy;
        } else {
            throw new Error('La DB proporcionada debe ser una instancia de la clase DB.');
        }
    }

    /**
     * Tabla para representar a la clase en la db, DEBE ser sobre escrita por la clase que me extiende
     * @property {string}
     */
    static get table() {
        return 'Model';
    }

    /**
     * Registro a la clase que extiende ante el modelo
     * @throws Imprime un error si la clase que extiende no tiene definida la propiedad estática table
     */
    static register() {
        MetaData.registerClass(this);
    }

    /**
     * Obtengo el nombre de la tabla correspondiente a la clase desde una instancia
     * @returns {string}
     */
    get table_name() {
        return this.constructor.table;
    }

    /**
     * Obtengo el nombre de la tabla correspondiente a la clase estáticamente
     * @returns {string}
     */
    static get table_name() {
        return this.table;
    }

    /**
     * Obtengo todos los elementos de una tabla en la DB y los instancio en su clase correspondiente
     * @returns {Promise<*>}
     */
    static async all() {

        return this.db.getAll(this.table_name).then(function (objs) {
            return this.instantiateArray(objs);
        }.bind(this));
    }

    /**
     * Obtengo las entradas de una tabla que correspondan con un index y key dados
     * @param {string} index - nombre del indice
     * @param {string|number} key - valor del indice
     * @returns {Promise<*>}
     */
    static async allFromIndex(index, key) {

        return this.db.getAllFromIndex(this.table_name, index, key).then(function (objs) {
            return this.instantiateArray(objs);
        }.bind(this));
    }

    /**
     * Obtengo un cursor para recorrer todas las entradas de una tabla que correspondan con un index dado
     * * CUIDADO: si se utiliza esta función, cursor.value no va a tener seteado el parámetro de instancia db,
     * hacerlo a mano.
     * @param {string} index - indice desde el cual consulto el id
     * @param {IDBCursorDirection} [extreme=DB.extremos.siguiente] - hacia donde apunta el cursor, atrás o adelante
     */
    static async allFromIndexCursor(index, extreme = DB.EXTREMOS.siguiente) {

        return this.db.getAllFromIndexCursor(this.table_name, index, extreme).then(function (cursor) {
            return cursor;
        });
    }

    /**
     * Obtengo un objeto de la db y lo instancio en su clase correspondiente, puedo especificar el indice, por
     * default es 'id'
     * @param {string|number} id - id a obtener
     * @param {string} [index='id'] - indice por el cual se consulta el id
     * @returns {Promise<*>}
     */
    static get(id, index = 'id') {

        return this.db.getByIndex(this.table_name, index, id).then(function (obj) {
            return this.instantiate(obj);
        }.bind(this));
    }

    /**
     * Obtengo la cant de entradas en una tabla dada
     * @returns {Promise<number>}
     */
    static count() {

        return this.db.count(this.table_name).then(function (cant) {
            return cant;
        });
    }

    /**
     * Obtengo la cantidad de entradas en un tabla, dado un indice y una key
     * @param {string} index - nombre del indice
     * @param key - valor del indice
     * @returns {Promise<number>}
     */
    static countFromIndex(index, key) {

        return this.db.countFromIndex(this.table_name, index, key).then(function (cant) {
            return cant;
        });
    }

    /**
     * Obtengo la ultima entrada de una tabla dado un indice
     * * Si la tabla esta vacía, retorno una instancia vacía
     * * Si la tabla tiene elementos, retorno una instancia del ultimo
     * @param {string} [index='id'] - indice por el cual se itera
     * @returns {Promise<*>}
     */
    static last(index = 'id') {
        return this.db.getMaxFromIndex(this.table_name, index).then(function (obj) {
            return this.instantiate(obj ? obj.value : null);
        }.bind(this));
    }

    /**
     * Obtengo la primera entrada de una tabla dado un indice
     * * Si la tabla esta vacía, retorno una instancia vacía
     * * Si la tabla tiene elementos, retorno una instancia del primero
     * @param {string} [index='id'] - indice por el cual se itera
     * @returns {Promise<*>}
     */
    static first(index = 'id') {
        return this.db.getMinFromIndex(this.table_name, index).then(function (obj) {
            return this.instantiate(obj ? obj.value : null);
        }.bind(this));
    }

    /**
     * Instancio un objeto en su clase correspondiente
     * @param {Object} [object=null] - el objeto a instanciar puede ser nulo
     * @returns {Model}
     */
    static instantiate(object = null) {
        if (object !== null) {
            let instance = new (MetaData.getClass(this.name))(object);
            instance.db = this.db;
            return instance;
        }
        return new (MetaData.getClass(this.name))();

    }

    /**
     * Instancio un array de objetos en una clase dada
     * @param {Object[]} objects
     * @returns {Model[]}
     */
    static instantiateArray(objects) {
        return objects.map((obj) => this.instantiate(obj));
    }

    /**
     * Actualizo al objeto en la db local
     * @returns {Promise<*>}
     */
    update() {
        return this.db.update(this);
    }

    /**
     * Quito un registro de la DB dado su id correspondiente
     * @param {string|number} id - id a obtener
     * @param {string} [index='id'] - indice por el cual se consulta el id
     * @returns {Promise<*>}
     */
    static remove(id, index = 'id') {
        let instance = this.get(id, index);
        return instance.remove();
    }

    /**
     * Quito a la instancia de su tabla correspondiente
     * @returns {Promise<*>}
     */
    remove() {
        return this.db.remove(this);
    }

    // Obtengo todos los elementos de una clase dada y los elimino de IndexedDB
    static async clean() {
        return this.db.clear(this.table_name);
    }

    /**
     * Guardo una instancia de una clase
     */
    save() {
        let elems = []
        elems.push(this);
        return this.constructor.store(elems);
    }

    /**
     * Verifico si una instancia esta vacía o no
     * @returns {boolean}
     */
    isEmpty() {
        return Object.keys(this).length === 0;
    }

    /**
     * Verifico si una instancia esta persistida en el servidor
     * * Cuando el id es menor a 0, solo esta persistida localmente
     * * Cuando es mayor, ya se persistió en el servidor y tanto la copia local como la del servidor poseen el
     * mismo id
     * @returns {boolean}
     */
    isPersisted() {
        return this.id > 0;
    }

    /**
     * Verifico si existe la entrada asociada a una id dada
     * @param {number} id
     * @returns boolean
     */
    static async exists(id) {
        return !(await this.get(id)).isEmpty();
    }

    /**
     * Verifico si una instancia de una clase existe, existe cuando no esta vacia,
     * esto puede suceder cuando al consultar indexedDB por una key, resulto que
     * la key no existe, por lo que te devuelve una instancia de la clase correspondiente vacia
     * @returns {boolean}
     */
    exists() {
        return !this.isEmpty();
    }

    /**
     * Almaceno un array de objetos de una clase dada en su tabla correspondiente
     * @param {[*]} objs
     */
    static store(objs) {
        return this.db.store(this.table_name, objs);
    }

    /**
     * Obtengo un próximo posible nuevo id(negativo)
     * @returns {Promise<number>}
     */
    static async nextNewId() {

        return this.first().then(function (first) {

            if (first.isEmpty()) {
                return -1;
            }
            return first.id >= 0 ? -1 : first.id - 1;
        });
    }
}

export {MetaData};

export {Model};
