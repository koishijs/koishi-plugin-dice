import { Context, Schema, segment } from 'koishi'
import { Config as OnediceConfig, dice } from '@onedice/core'
import { Config } from '.'

export type DiceConfig = OnediceConfig & {
  inline: boolean
  maxDetailsSize: number
}

export const DiceSchema: Schema<DiceConfig> = Schema.object({
  random: Schema.function().description('随机数生成函数。'),
  maxRollCount: Schema.number().description('单次投掷最大投掷数量。').min(0).step(1),
  inline: Schema.boolean().default(true),
  maxDetailsSize: Schema.number().description('过程展示最大字数，超过则省略过程。').default(500),
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
      const expression = (raw ? segment.unescape(raw.trim()) : raw) || 'd'
      try {
        const [value, root] = dice(expression.toLowerCase())
        const details = root.toString()
        const name = session.user.name || session.author.nickname || session.author.username
        const left = reason
          ? `${name} 因为 ${reason} 投掷:\n`
          : `${name} 投掷:\n`
        const message = details.length > config.maxDetailsSize
          ? `${left}${expression} = ${value}`
          : `${left}${expression} = ${details} = ${value}`
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