const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const { parse, print, visit } = require('recast')
const ncp = promisify(require('ncp').ncp)
const uniqueId = require('./uniqueId')

const CONFIG_VARIABLE_PREFIX = 'injectedExtensionConfig'

class Injector {
    constructor(defiferJs) {
        const source = fs.readFileSync(defiferJs, { encoding: 'utf8' })
        this.ast = parse(source)
        this.defiferJs = defiferJs
        this.extensionsArr = null
        this.injectedConfigs = []
        this.injectedPositions = []

        this.traverse()
    }

    get swanExtensionsDir() {
        const defiferJsDir = path.dirname(this.defiferJs)
        return path.resolve(defiferJsDir, './extensions')
    }

    get lastInjectionPosition() {
        if (this.injectedConfigs.length) {
            const lastInjectedConfig = this.injectedConfigs[this.injectedConfigs.length - 1]
            const lastInjectedPosition = this.injectedPositions.find(p => {
                const { arguments: args } = p.value.expression
                const { id } = lastInjectedConfig.value.declarations[0]
                return args[0].name === id.name
            })

            if (lastInjectedPosition) {
                return lastInjectedPosition
            }
        }
        return this.extensionsArr
    }

    save() {
        const { code } = print(this.ast)
        fs.writeFileSync(this.defiferJs, code, { encoding: 'utf8' })

        this.traverse()
    }

    traverse() {
        const self = this

        visit(this.ast, {
            visitVariableDeclaration(p) {
                for (const declaration of p.value.declarations) {
                    // 百度智能小程序中维护的扩展程序列表
                    if (
                        declaration.type === 'VariableDeclarator' &&
                        declaration.id.name === 'extensionsArr'
                    ) {
                        self.extensionsArr = p
                    }

                    // 已经注入的扩展程序配置
                    if (
                        declaration.type === 'VariableDeclarator' &&
                        RegExp(`^${CONFIG_VARIABLE_PREFIX}\\d+$`).test(declaration.id.name)
                    ) {
                        self.injectedConfigs.push(p)
                    }
                }

               this.traverse(p)
            },
            visitExpressionStatement(p) {
                const { expression } = p.value
                
                // 扩展程序的注入位置
                if (expression.type === 'CallExpression') {
                    const { callee, arguments: args } = expression
                    if (
                        callee.type === 'MemberExpression' &&
                        callee.object.name === 'extensionsArr' &&
                        callee.property.name === 'push' &&
                        args.length === 1 &&
                        args[0].type === 'Identifier' &&
                        RegExp(`^${CONFIG_VARIABLE_PREFIX}\\d+$`).test(args[0].name)
                    ) {
                        self.injectedPositions.push(p)
                    }
                }

                this.traverse(p)
            }
        })
    }

    nextConfigId() {
        for (;;) {
            const configId = uniqueId(CONFIG_VARIABLE_PREFIX)
            const result = this.injectedConfigs.some(p => {
                for (const declaration of p.value.declarations) {
                    return declaration.id.name === configId
                }
                return false
            })
            if (!result) {
                return configId
            }
        }
    }

    async inject(extensionDir) {
        try {
            fs.accessSync(this.swanExtensionsDir)
        } catch {
            throw new Error('百度开发者工具扩展程序目录不可访问')
        }

        const destination = path.join(this.swanExtensionsDir, path.basename(extensionDir))
        try {
            fs.accessSync(destination)
        } catch {
            fs.mkdirSync(destination)
        }
        await ncp(extensionDir, destination, {
            clobber: false,
            dereference: true
        })

        const manifestPath = path.join(destination, 'manifest.json')
        const manifestText = fs.readFileSync(manifestPath, { encoding: 'utf8' })
        const manifest = JSON.parse(manifestText)
        if (this.has(manifest.name)) {
            throw new Error(`${manifest.name} 扩展程序已被注入`)
        }

        const devtoolsPage = path.resolve(destination, manifest.devtools_page)
        const defiferJsDir = path.dirname(this.defiferJs)

        const startPage = path.relative(defiferJsDir, devtoolsPage)
        const origin = path.relative(defiferJsDir, destination)

        const configId = this.nextConfigId()

        const code = `
            const ${configId} = {
                startPage: '${startPage}',
                contentScripts: {
                    js: [],
                    runAt: 'document_start'
                },
                origin: '${origin}',
                name: '${manifest.name}',
                id: '${configId}',
                exposeExperimentalAPIs: true
            };
            extensionsArr.push(${configId})
        `
        const [config, position] = parse(code).program.body
        const injectionPosition = this.lastInjectionPosition
        injectionPosition.insertAfter(position)
        injectionPosition.insertAfter(config)

        this.save()
    }

    list() {
        const extensionNames = this.injectedConfigs.map(p => {
            const { properties } = p.value.declarations[0].init
            const nameProperty = properties.find(p => p.key.name === 'name')
            return nameProperty.value.value
        })
        return extensionNames
    }

    has(extensionName) {
        const extensionNames = this.list()
        return extensionNames.includes(extensionName)
    }

    remove(extensionName) {
        const config = this.injectedConfigs.find(p => {
            const { properties } = p.value.declarations[0].init
            const nameProperty = properties.find(p => p.key.name === 'name')
            return nameProperty.value.value === extensionName
        })
        const position = this.injectedPositions.find(p => {
            const { arguments: args } = p.value.expression
            const { id } = config.value.declarations[0]
            return args[0].name === id.name
        })
        config.prune()
        position.prune()

        this.save()
    }
}

module.exports = Injector
