import {Snowflake} from "discord.js";
import * as fs from "fs";

export interface GuildChannelSaver {
    getHoFChannel(guildId: Snowflake): string | null

    setHoFChannel(guildId: Snowflake, channelId: Snowflake): void
}

export class GuildChannelSaverImpl implements GuildChannelSaver {
    getHoFChannel(guildId: Snowflake): string | null {
        return this.getJson()[guildId]
    }

    setHoFChannel(guildId: Snowflake, channelId: Snowflake): void {
        const json = this.getJson()
        json[guildId] = channelId
        fs.writeFileSync(this.file(), JSON.stringify(json))
    }

    private getJson(): any {
        const string = fs.readFileSync(this.file(), {encoding: "utf8"})
        return JSON.parse(string)
    }

    private file(): string {
        return __dirname + "/guild-channels.json"
    }
}
