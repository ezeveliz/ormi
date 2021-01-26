# ORMI
WIP ORM for IndexedDB

## How to use
Import classes

```
import {MigrationVersion} from './modules/orm/migration/Migration';
import {DB} from './modules/orm/db/DB';
import {MetaData, Model} from './modules/orm/model/Model';

window.MigrationVersion = MigrationVersion;
window.DB = DB;
window.MetaData = MetaData;
window.Model = Model;
```

Model class is not necessary, in case you use it, you SHOULD import both Model and MetaData.

In case you don't use Model class, you must take care of adding a table_name and id property to the object to persist. 

Now, in case you're using the Model, declare the classes that extend it, there are only four requirements:
* A static get table method, this method returns the table name related to the class.
* A static get class method, this is the name of the class. Compilers remove class names so this helps the model keep track of it.
* A constructor, used to instantiate objects retrieved from the DB.
* After declaring the class, you must register it;

```
class Cat extends Model {

    static get table() {
        return 'cats';
    }
    
    static get class() {
        return 'Cat';
    }
    
    constructor(c = null) {
    
        super();
        if (c) {
            this.id = c._id;
            this.color = c._color;
        }
    }
}

Cat.register()
```

