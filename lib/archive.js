const fs = require('fs')
const path = require('path')
const asar = require('asar')
const { promisify } = require('util')
const rimraf = promisify(require('rimraf'))
const latestVersion = require('./latestVersion')

function getDevtoolsAsarDarwin(defaulDir) {
    if (process.platform !== 'darwin') {
        return null
    }

    let dir
    try {
        const homeDir = path.join(process.env.HOME, defaulDir)
        fs.accessSync(homeDir)
        dir = homeDir
    } catch (e) {
        fs.accessSync(defaulDir)
        dir = defaulDir
    }


    const versions = fs.readdirSync(dir)
    const latest = latestVersion(versions)
    const contentAsarPath = path.join(dir, latest, 'content.asar')
    fs.accessSync(contentAsarPath)
    return contentAsarPath
}

const DEVTOOLS_ASAR = {
    darwin: getDevtoolsAsarDarwin('/Library/Application Support/百度开发者工具/cli/vendor/swan-devtools-asar')
}

class Archive {
    constructor(platform = process.platform) {
        if (platform !== 'darwin') {
            throw new Error('当前只支持 darwin 系统')
        }

        this.archive = DEVTOOLS_ASAR[process.platform]
    }

    extract() {
        const dir = path.dirname(this.archive)
        this.extractedDir = path.join(dir, 'content.asar.extracted')
        asar.extractAll(this.archive, this.extractedDir)
        return this.extractedDir
    }

    overwrite() {
        if (!this.extractedDir) {
            return Promise.resolve()
        }
        return asar.createPackage(this.extractedDir, this.archive)
    }

    dispose() {
        return rimraf(this.extractedDir)
    }

    getDefiferJs() {
        if (!this.extractedDir) {
            this.extract()
        }
        return path.join(this.extractedDir, 'defifer.js')
    }
}

module.exports = Archive
