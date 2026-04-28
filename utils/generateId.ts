const ID_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export const generateId = (length = 12) => {
    let result = '';

    for (let index = 0; index < length; index += 1) {
        const randomIndex = Math.floor(Math.random() * ID_CHARACTERS.length);
        result += ID_CHARACTERS[randomIndex];
    }

    return result;
};
