import config from "../config.json"

export interface Config {
    readonly botToken: string
    readonly botApplicationId: string
    readonly guildIds: string[]
}

export class ConfigImpl implements Config {
    public readonly botToken: string = config.token
    public readonly botApplicationId: string = config.client_id
    public readonly guildIds: string[] = config.guild_ids
}
