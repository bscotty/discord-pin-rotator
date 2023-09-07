import {SlashCommandBuilder} from "discord.js";
import {HALL_OF_FAME, HOF_DESCRIPTION, HOF_MESSAGE_ID, SET_CHANNEL} from "./constants";

export function hallOfFameCommand(): SlashCommandBuilder {
    const command = new SlashCommandBuilder()
        .setName(HALL_OF_FAME)
        .setDescription("Add a message to the Hall of Fame channel")

    command.addStringOption((option) => option
        .setName(HOF_MESSAGE_ID)
        .setDescription("The ID of the message to move to the Hall of Fame")
        .setRequired(true)
    )

    command.addStringOption((option) =>
        option.setName(HOF_DESCRIPTION)
            .setDescription("A description of or commentary on the message")
            .setRequired(false)
    )

    return command
}

export function setChannelCommand(): SlashCommandBuilder {
    return new SlashCommandBuilder()
        .setName(SET_CHANNEL)
        .setDescription("Set a channel to the Hall of Fame channel")
}
