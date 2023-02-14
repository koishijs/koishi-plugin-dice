import { Context, Schema } from 'koishi'
import { DiceConfig, DiceSchema, onedice } from './onedice'

export const name = 'dice'

export type Config = DiceConfig

export const Config: Schema<Config> = Schema.intersect([
  DiceSchema,
])

export function apply(ctx: Context, config: Config) {
  ctx.plugin(onedice, config)
}
