const idCounter = {}

function uniqueId(prefix) {
    if (!idCounter[prefix]) {
        idCounter[prefix] = 0
    }

    const id = ++idCounter[prefix]
    if (prefix == null) {
        return `${id}`
    }

    return `${prefix}${id}`
}

module.exports = uniqueId
