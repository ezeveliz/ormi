//
class Collection {

    get elements() {
        return this._elements;
    }

    set elements(array) {
        this._elements = array;
    }

    constructor(array) {
        if (array !== null && Array.isArray(array) && array.length > 0) {
            this.elements = array;
        } else {
            this.elements = [];
        }
    }
}