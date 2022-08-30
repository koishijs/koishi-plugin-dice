import { Context, Schema } from 'koishi'
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
    const { content, prefix } = session.parsed
    if (prefix === null || content[0] !== 'r') return next()
    const expression = content.slice(1)
    return session.execute({ name: 'roll', args: [expression] })
  })

  ctx.command('roll [expression:rawtext]', '投掷')
    .userFields(['name'])
    .action(({ session }, raw) => {
      const expression = (raw ? raw.trim() : raw) || 'd'
      try {
        const [value, root] = dice(expression.toLowerCase())
        const details = root.toString()
        const name = session.user.name || session.author.nickname || session.author.username
        if (details.length > config.maxDetailsSize) {
          return `${name} 投掷:\n${expression} = ${value}`
        } else {
          return `${name} 投掷:\n${expression} = ${details} = ${value}`
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