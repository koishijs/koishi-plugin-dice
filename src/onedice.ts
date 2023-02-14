import { Context, Schema, segment } from 'koishi'
import { Config as OnediceConfig, dice } from '@onedice/core'
import { Config } from '.'

export type DiceConfig = {
  maxDetailsSize: number
  maxRollTimes: number
  onedice: OnediceConfig
}

export const DiceSchema: Schema<DiceConfig> = Schema.object({
  maxRollTimes: Schema.number().description('最大重复投掷次数。').default(10),
  maxDetailsSize: Schema.number().description('过程展示最大字数，超过则省略过程。').default(500),
  onedice: Schema.intersect([
    Schema.object({
      random: Schema.function().description('随机数生成函数。').hidden(),
      maxRollCount: Schema.number().description('单次投掷最大投掷数量。').min(0).step(1),
    }),
    Schema.object({
      d: Schema.object({
        a: Schema.number().description('掷出多少个骰子'),
        b: Schema.number().description('掷出的骰子有多少面'),
        c: Schema.number().description('符号 k/q, 只选取最大/小骰子结果的个数, k 大 q 小'),
        d: Schema.number().description('符号 p/b, 追加奖惩骰的个数'),
        e: Schema.number().description('符号 a, 功能转换为骰池，结果转为记录不低于该值的骰子个数'),
      }).description('普通多面掷骰'),
      p: Schema.object({
        // a: Schema.number().description('无意义'),
        b: Schema.number().description('追加奖惩骰的个数'),
      }).description('惩罚骰/奖励骰'),
      a: Schema.object({
        a: Schema.number().description('第一轮掷出多少个骰子'),
        b: Schema.number().description('每有一枚不低于该值，则下一轮掷骰增加一枚骰子'),
        c: Schema.number().description('符号 k, 最终计算不低于该参数的骰子个数'),
        d: Schema.number().description('符号 q, 最终计算不高于该参数的骰子个数'),
        e: Schema.number().description('符号 m, 掷出的骰子有多少面'),
      }).description('无限加骰池'),
      c: Schema.object({
        a: Schema.number().description('第一轮掷出多少个骰子'),
        b: Schema.number().description('每有一枚不低于该值，则下一轮掷骰增加一枚骰子'),
        c: Schema.number().description('符号 m, 掷出的骰子有多少面'),
      }).description('双重十字加骰池'),
      f: Schema.object({
        a: Schema.number().description('掷出多少个骰子'),
        // b: Schema.number().description('无意义'),
      }).description('FATE 掷骰池'),
    }).description('骰子表达式默认值'),
  ]),
})


export function onedice(ctx: Context, config: Config) {
  ctx.middleware((session, next) => {
    const { content, prefix, appel } = session.parsed
    if (prefix === null && !appel) return next()
    const noprefix = prefix ? content.substring(prefix.length) : content
    const res = /^(rh?|ww?|r?dx?)(.*)$/.exec(noprefix)
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
      const name = session.username
      const left = reason
        ? `${name} 因为 ${reason} 投掷:\n`
        : `${name} 投掷:\n`
      try {
        const dices = new Array(times).fill(0).map(_ => dice(diceExpression, config.onedice))
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
