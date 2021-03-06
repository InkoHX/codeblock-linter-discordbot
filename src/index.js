'use strict'

const Discord = require('discord.js')
const { ESLint } = require('eslint')

const client = new Discord.Client({
  ws: {
    intents: Discord.Intents.NON_PRIVILEGED
  },
  http: {
    api: 'https://discord.com/api'
  }
})

const linter = new ESLint({
  baseConfig: {
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
    env: {
      node: true,
      es6: true
    },
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module'
    }
  },
  useEslintrc: false
})

client.once('ready', () => console.log('READY!'))

client.on('message', message => {
  if (message.author.bot || message.system) return

  const codes = [...message.content.matchAll(/`{3}(?:js|ts)\n(?<code>[\s\S]*?)\n`{3}/gu)]
    .map(result => result.groups.code)

  if (!codes.length) return

  message.react('✅')
    .then(reaction => reaction.message.awaitReactions((reaction, user) => !user.bot && reaction.emoji.name === '✅', { max: 1 }))
    .then(() => message.reactions.removeAll())
    .then(() => Promise.all(codes.map(code => linter.lintText(code))))
    .then(results => results.flat())
    .then(results => Promise.all(results.map(result => message.reply(createLintResultEmbed(result)))))
})

/**
 * @param result {import('eslint').ESLint.LintResult}
 */
function createLintResultEmbed(result) {
  const parseSeverity = severity => severity === 2 ? 'ERROR' : 'WARNING'
  const color = result.errorCount
    ? 'RED'
    : result.warningCount
      ? 'YELLOW'
      : 'GREEN'
  const messages = result.messages.map(({
    line,
    column,
    severity,
    ruleId,
    message
  }) => `${parseSeverity(severity)} ${message} (${ruleId}) [${line}, ${column}]`)

  return new Discord.MessageEmbed()
    .setColor(color)
    .setDescription(`\`\`\`js\n${messages.join('\n') || 'PASSING'}\n\`\`\``)
    .addField('エラー', result.errorCount, true)
    .addField('警告', result.warningCount, true)
}

client.login()
  .catch(console.error)
