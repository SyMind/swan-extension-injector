const VERSION_REGEX = /^(\d+).(\d+).(\d+)$/

function split(version) {
    return version.split('.').map(s => Number(s))
}

function latestVersion(versions) {
    versions = versions.filter(v => VERSION_REGEX.test(v))

    if (versions.length === 0) {
        return null
    }

    let max = versions[0]
    let maxNs = split(max)

    for (let i = 1; i < versions.length; i++) {
        const version = versions[i]
        const ns = split(version)

        for (let j = 0; j < 3; j++) {
            const n1 = maxNs[j]
            const n2 = ns[j]
        
            if (n1 > n2) {
                break
            }
            
            if (n1 < n2) {
                max = version
                maxNs = ns
                break
            }
        }
    }

    return max
}

module.exports = latestVersion;
