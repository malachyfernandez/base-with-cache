export function deepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;

    if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) {
        return false;
    }

    const isArr1 = Array.isArray(obj1);
    const isArr2 = Array.isArray(obj2);

    if (isArr1 !== isArr2) return false;

    if (isArr1) {
        if (obj1.length !== obj2.length) return false;
        for (let i = 0; i < obj1.length; i++) {
            if (!deepEqual(obj1[i], obj2[i])) return false;
        }
        return true;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
        if (!Object.prototype.hasOwnProperty.call(obj2, key)) return false;
        if (!deepEqual(obj1[key], obj2[key])) return false;
    }

    return true;
}
