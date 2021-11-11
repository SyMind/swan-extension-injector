const path = require('path')
const { promisify } = require('util')
const ncp = promisify(require('ncp').ncp)
const rimraf = promisify(require('rimraf'))
const fs = require('fs')
const Injector = require('../lib/injector')

const fixtures = path.join(__dirname, '__fixtures__')

describe('Injector', () => {
    const dir = path.join(fixtures, 'swan-devtools-content')
    const backup = path.join(fixtures, 'swan-devtools-content.backup')

    beforeEach(async () => {
        await ncp(dir, backup)
    })

    afterEach(async () => {
        await rimraf(dir)
        fs.renameSync(backup, dir)
    })

    const defiferJs = path.join(fixtures, 'swan-devtools-content/defifer.js')
    const exampleExtension = path.resolve(__dirname, './example-extension')

    describe('#constructor', () => {
        it('defifer.js 文件不存在时报错', () => {
            expect(() => {
                const defiferJs = path.join(fixtures, 'non-existent/defifer.js')
                new Injector(defiferJs)
            }).toThrow()
        })
    })

    describe('#inject', () => {
        const injector = new Injector(defiferJs)

        it('注入新的扩展程序', async () => {
            await injector.inject(exampleExtension)
        })

        it('注入已有扩展程序时报错', async () => {
            await expect(injector.inject(exampleExtension)).rejects.toThrow()
        })
    })

    describe('#remove', () => {
        it('删除已注入的扩展程序', async () => {
            const injector = new Injector(defiferJs)

            await injector.inject(exampleExtension)
            await injector.remove('Getting Started Example')

            const defiferJsText = fs.readFileSync(defiferJs, {
                encoding: 'utf8'
            })
            const backupDefiferJsText = fs.readFileSync(path.join(backup, 'defifer.js'), {
                encoding: 'utf8'
            })
            expect(defiferJsText).toEqual(backupDefiferJsText)
        })
    })

    describe('#list', () => {
        it('展示已注入的扩展程序', async () => {
            const injector = new Injector(defiferJs)

            await injector.inject(exampleExtension)
            const names = await injector.list()
            expect(names).toEqual(['Getting Started Example'])
        })
    })
})
