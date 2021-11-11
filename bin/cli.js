#! /usr/bin/env node

const yargs = require('yargs')
const { hideBin } = require('yargs/helpers')
const chalk = require('chalk')
const { Archive, Injector } = require('../lib')
const package = require('../package.json')

async function run(task) {
    let archive
    try {
        archive = new Archive()
        const defiferJs = archive.getDefiferJs()
        const injector = new Injector(defiferJs)
        await task(injector)
    } catch (error) {
        console.log(chalk.red(error.message))
    } finally {
        if (archive) {
            archive.dispose()
        }
    }
}

yargs(hideBin(process.argv))
    .usage('$0 <cmd> [args]')
    .command(
        ['inject [dir]', 'i [dir]'],
        '注入扩展程序到百度开发者工具中',
        yargs => yargs
            .positional('dir', {
                describe: '已解压的扩展程序目录'
            }),
        async argv => {
            run(injector => injector.inject(argv.dir))
        }
    )
    .command(
        ['remove [name]', 'rm [name]'],
        '移除已经注入的扩展程序',
        yargs => yargs
            .positional('name', {
                describe: '已经注入的扩展程序名'
            }),
        argv => {
            run(injector => injector.remove(argv.name))
        }
    )
    .command(
        ['list', 'ls'],
        '查看所有已经注入的扩展程序',
        () => {
            run(injector => {
                const names = injector.list()
                console.log(chalk.green(names.join('\n')))
            })
        }
    )
    .help('help').alias('help', 'h')
    .version('version', package.version).alias('version', 'v')
    .parse()