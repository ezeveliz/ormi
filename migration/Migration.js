class Migration {

    set #name(value) {
        this.#_name = value;
    }

    get #version() {
        return this.#_version;
    }

    set #version(value) {
        this.#_version = value;
    }
    #_name;
    #_version;
    #_migrations = [];

    constructor(name, version, migration) {
        this.#name = name;
        this.#version = version;
        this.#_migrations.push(migration);
        return this;
    }

    add(migration) {
        this.#version ++;
        this.#_migrations.push(migration);
        return this;
    }

    run() {}
}

class MigrationVersion {
    
}