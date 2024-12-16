import {
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    GatewayIntentBits,
    messageLink,
    REST,
    Routes,
    SlashCommandBuilder,
    TextChannel,
    time,
    userMention
} from "discord.js";
import {Config} from "./config";
import {HALL_OF_FAME, HOF_DESCRIPTION, HOF_MESSAGE_ID, SET_CHANNEL} from "./constants";
import {GuildChannelSaver} from "./datastore/guildChannelSaver";

export class BotClient {
    private readonly client: Client
    private readonly rest: REST

    constructor(
        private readonly config: Config,
        private readonly saver: GuildChannelSaver
    ) {
        const options = {
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ]
        }
        this.rest = new REST({version: "10"}).setToken(this.config.botToken)

        this.client = new Client(options)
        this.client.once("ready", () => {
            console.log("ready")
        })
    }

    public async login() {
        await this.client.login(this.config.botToken)
            .then(() => console.log("logged in"))
            .catch((reason) => console.error(reason))
    }

    public async registerCommands(commands: SlashCommandBuilder[]) {
        const requests: Promise<unknown>[] = this.config.guildIds.map(async (guild) => {
            const route = Routes.applicationGuildCommands(this.config.botApplicationId, guild)
            const body = {body: commands.map((it) => it.toJSON())}
            await this.rest.put(route, body)
                .then(() => {
                    const commandNames = commands.map((it) => it.name).join(",")
                    console.log(`put commands [${commandNames}] to guild ${guild}`)
                })
        })
        await Promise.all(requests)
            .then(() => console.log("all commands registered"))
            .catch((reason) => console.error(reason))
    }

    public async listenForCommands() {

        this.client.on("interactionCreate", async interaction => {
            if (!interaction.isChatInputCommand()) return;

            const {commandName} = interaction
            if (commandName == HALL_OF_FAME) {
                await this.hallOfFame(interaction)
                    .catch(async (it) => {
                        console.error(it)
                        await interaction.reply("There was a problem moving that to the hall of fame.")
                    })
            }
            if (commandName == SET_CHANNEL) {
                await this.setChannel(interaction)
                    .catch(async (it) => {
                        console.error(it)
                        await interaction.reply("There was a problem setting this channel as the hall of fame.")
                    })
            }
        })
    }

    private async hallOfFame(interaction: ChatInputCommandInteraction) {
        const {commandGuildId, channel} = interaction
        const messageId = interaction.options.get(HOF_MESSAGE_ID).value as string
        const descriptionCommentary = interaction.options.get(HOF_DESCRIPTION, false)

        const fetchedChannel = await channel.fetch() as TextChannel
        const message = await fetchedChannel.messages.fetch(messageId)
        console.debug(`sending message to hall of fame: ${message.content}`)

        const guild = await this.client.guilds.fetch(commandGuildId)

        const hofChannelId = this.saver.getHoFChannel(interaction.guildId)
        const hofChannel = await guild.channels.fetch(hofChannelId)

        let avatarUrl = message.author.avatarURL()
        if (avatarUrl == null) {
            avatarUrl = "https://cdn.discordapp.com/attachments/301734382022950932/1025582339339862046/Discord_-_Erics_Icon.png"
        }

        const linkToMessage = messageLink(channel.id, messageId, commandGuildId)

        const embed = new EmbedBuilder()
            .setThumbnail(avatarUrl)
            .setTitle("Hall of Fame Entry")
            .setURL(linkToMessage)
            .addFields(
                {name: "Posted by", value: `${userMention(message.author.id)}`, inline: true},
                {name: "Originally posted at", value: time(message.createdAt), inline: true}
            )


        try {
            let member = await guild.members.fetch(message.author.id)

            const color = member.displayHexColor
            if (color != null && color !== "#000000") {
                embed.setColor(color)
            }
        } catch (e) {
            console.error(e)
        }

        if (message.embeds.length > 0) {
            const embedToCopy = message.embeds[0]
            const urlToCopy = embedToCopy.url
            if (urlToCopy != null && urlToCopy.length > 0 && this.isImageUrl(urlToCopy)) {
                embed.setImage(urlToCopy)
            } else {
                const footerText = embedToCopy.footer ? "\n\n" + embedToCopy.footer.text.replace("-", "\\-") : ""
                const description = embedToCopy.description ? embedToCopy.description + footerText : "Error copying Haiku"
                embed.addFields({name: "Original Embed", value: description, inline: false})
            }
        }

        if (message.content.length > 1024) {
            embed.addFields(
                this.split(message.content).map((it, index) => {
                    return {name: `Message (Part ${index + 1})`, value: it, inline: false}
                })
            )
        } else if (this.isImageUrl(message.content)) {
            embed.setImage(message.content)
        } else if (message.content.length > 0) {
            embed.addFields({name: "Message", value: message.content, inline: false})
        }

        if (message.attachments.size > 0) {
            message.attachments.forEach((it) => {
                if (it.contentType != null && it.contentType.startsWith("image/")) {
                    embed.setImage(it.url)
                } else if (this.hasImageExtension(it.url)) {
                    embed.setImage(it.url)
                }
            })
        }

        if (descriptionCommentary != null) {
            embed.setDescription(descriptionCommentary.value as string)
        }

        await (hofChannel as TextChannel).send({embeds: [embed]})
            .then(async () => {
                const pinnedMessages = await (channel as TextChannel).messages.fetchPinned()
                const pin = pinnedMessages.find((message) => message.id == messageId)
                if (pin) {
                    await pin.unpin("Moving to the Hall of Fame")
                }
            })
        await interaction.reply(`Adding message ${linkToMessage} to the Hall of Fame!`)
    }

    private split(response: string): string[] {
        const lines: string[] = response.split("\n")
        const splitResponse: string[] = []

        let currentIndex = 0
        lines.forEach((response) => {
            if (splitResponse.length <= currentIndex) {
                splitResponse.push(response)
            } else if (splitResponse[currentIndex].length + response.length < 2000) {
                splitResponse[currentIndex] = splitResponse[currentIndex] + "\n" + response
            } else {
                splitResponse.push(response)
                currentIndex += 1
            }
        })
        return splitResponse
    }

    private isImageUrl(content: string): boolean {
        try {
            const url = new URL(content)
            return this.hasImageExtension(content)
        } catch (e) {
            return false
        }
    }

    private hasImageExtension(content: string): boolean {
        return (
            content.includes(".png") ||
            content.includes(".gif") ||
            content.includes(".jpg") ||
            content.includes(".jpeg") ||
            content.includes(".webm")
        )
    }

    private async setChannel(interaction: ChatInputCommandInteraction) {
        await interaction.reply("This channel is now the Hall of Fame!")
        const {commandGuildId, channelId} = interaction
        this.saver.setHoFChannel(commandGuildId, channelId)
    }
}