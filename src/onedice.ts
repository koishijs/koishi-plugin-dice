import { Context, Schema, segment } from 'koishi'
import { Config as OnediceConfig, dice } from '@onedice/core'
import { Config } from '.'

export type DiceConfig = OnediceConfig & {
  inline: boolean
  maxDetailsSize: number
  maxRollTimes: number
}

export const DiceSchema: Schema<DiceConfig> = Schema.object({
  random: Schema.function().description('随机数生成函数。'),
  maxRollCount: Schema.number().description('单次投掷最大投掷数量。').min(0).step(1),
  maxRollTimes: Schema.number().description('最大重复投掷次数。').default(10),
  maxDetailsSize: Schema.number().description('过程展示最大字数，超过则省略过程。').default(500),
  inline: Schema.boolean().default(true),
  d: Schema.object({
    a: Schema.number(),
    b: Schema.number(),
    c: Schema.number(),
    d: Schema.number(),
    e: Schema.number(),
  }),
  p: Schema.object({
    a: Schema.number(),
    b: Schema.number(),
  }),
  a: Schema.object({
    a: Schema.number(),
    b: Schema.number(),
    c: Schema.number(),
    d: Schema.number(),
    e: Schema.number(),
  }),
  c: Schema.object({
    a: Schema.number(),
    b: Schema.number(),
    c: Schema.number(),
  }),
  f: Schema.object({
    a: Schema.number(),
    b: Schema.number(),
  }),
})


export function onedice(ctx: Context, config: Config) {
  ctx.middleware((session, next) => {
    const { content, prefix, appel } = session.parsed
    if (prefix === null && !appel) return next()
    const res = /^(rh?|ww?|r?dx?)(.*)$/.exec(content)
    if (!res) return next()
    const [, type, raw] = res
    const args = raw.trim().split(/\s+/)
    if (args.length > 2) return next('表达式或原因中不可含有空格。')
    return session.execute({
      name: 'roll',
      options: {
        rh: type === 'rh'
      },
      args,
    })
  })

  ctx.command('roll [expression:string] [reason:string]', '投掷')
    .userFields(['name'])
    .option('rh', '暗骰')
    .action(async ({ session, options }, raw, reason) => {
      const expression = (raw ? segment.unescape(raw.trim()) : '') || 'd'
      const splited = expression.split('#')
      if (splited.length > 2) return '表达式错误。'
      const times = splited.length === 2 ? +splited[0] : 1
      const diceExpression = (splited.length === 2 ? splited[1] : splited[0]).toLowerCase()
      if (!Number.isFinite(times) || times > config.maxRollTimes)
        return '请输入正确的投掷次数。'
      const name = session.user.name || session.author.nickname || session.author.username
      const left = reason
        ? `${name} 因为 ${reason} 投掷:\n`
        : `${name} 投掷:\n`
      try {
        const dices = new Array(times).fill(0).map(_ => dice(diceExpression, config))
        let message: string
        if (times === 1) {
          const [[value, root]] = dices
          const details = root.toString()
          message = details.length > config.maxDetailsSize
            ? `${left}${expression} = ${value}`
            : `${left}${expression} = ${details} = ${value}`
        } else {
          const results = dices.map(n => n[0]).join(', ')
          message = `${left}${expression} = ${results}`
        }
        if (options.rh) {
          await session.bot.sendPrivateMessage(session.userId, message)
          return `${name} 投掷了暗骰。`
        } else {
          return message
        }
      } catch (e) {
        if (e instanceof Error) {
          return e.message
        } else {
          return String(e)
        }
      }
    })
}
