import {BotClient} from "./botClient";
import {ConfigImpl} from "./config";
import {hallOfFameCommand, setChannelCommand} from "./commands";
import {GuildChannelSaverImpl} from "./datastore/guildChannelSaver";

const client = new BotClient(new ConfigImpl(), new GuildChannelSaverImpl())

const commands = [setChannelCommand(), hallOfFameCommand()]

client.login()
    .then(async () => {
        await client.registerCommands(commands)
            .catch((reason) => console.error(reason))
            .then(async () => {
                await client.listenForCommands()
                    .catch((reason) => console.error(reason))
            })
    })
    .catch((reason) => console.error(reason))
