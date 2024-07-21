import { Context, Random } from 'koishi'

export interface RollConfig {
  maxPoint?: number
  maxTimes?: number
}

export default function apply(ctx: Context, options: RollConfig = {}) {
  const { maxPoint = 1 << 16, maxTimes = 64 } = options
  const regexp = /^((\d*)d)?(\d+)(\+((\d*)d)?(\d+))*$/i

  ctx.command('roll [expr]', '掷骰')
    .shortcut('掷骰', { fuzzy: true })
    .example('roll 2d6+d10')
    .action(async ({ session }, message = '1d6') => {
      if (!regexp.test(message)) return '表达式语法错误。'

      const expressions = message.split('+')
      let hasMultiple = false
      let output = `${session.username} 掷骰：${message}=`
      let total = 0

      for (const expr of expressions) {
        const [, dice, _times, _max] = /^((\d*)d)?(\d+)$/i.exec(expr)
        const max = +_max
        if (!max || max > maxPoint) {
          return `点数必须在 1 到 ${maxPoint} 之间。`
        }

        if (!dice) {
          output += max + '+'
          total += max
          continue
        }

        const times = +(_times || 1)
        if (!times || times > maxTimes) {
          return `次数必须在 1 到 ${maxTimes} 之间。`
        }

        const values = []
        for (let index = 0; index < times; index += 1) {
          const value = Random.int(max) + 1
          values.push(value)
          total += value
        }
        if (times > 1) hasMultiple = true
        if (times > 1 && expressions.length > 1) {
          output += '('
        }
        output += values.join('+')
        if (times > 1 && expressions.length > 1) {
          output += ')'
        }
        output += '+'
      }

      output = output.slice(0, -1)
      if (hasMultiple || expressions.length > 1) {
        output += '=' + total
      }
      return output
    })

  ctx.middleware((session, next) => {
    const elements = session.elements
    const selfId = session.bot.selfId
    const prefix: string | string[] = session.app.config.prefix.valueOf()

    if (!elements || !elements.length) {
      return next()
    }
    if (elements[0].type === 'at' && elements[0].attrs?.id === selfId) {
      elements.shift()
    }
    if (elements[0].type !== 'text') {
      return next()
    }

    let msg: string = elements[0].attrs.content.trim()
    if (typeof prefix === 'string') {
      if (msg.startsWith(prefix)) {
        msg = msg.substring(prefix.length, msg.length)
      }
    } else if (Array.isArray(prefix)) {
      for (const pre of prefix) {
        if (msg.startsWith(pre)) {
          msg = msg.substring(pre.length, msg.length)
        }
      }
    }

    if (msg[0] !== 'r') return next()
    const expr = msg.slice(1).trim()
    if (!regexp.test(expr)) return next()
    return session.execute({ name: 'roll', args: [expr] })
  })
}
