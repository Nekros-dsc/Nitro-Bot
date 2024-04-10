const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const Database = require("simple-json-db");
const config = require("./config");
const db = new Database("./data.json");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ]
});

const commands = [
  {
    name: "give",
    description: "Give a Nitro to a user",
    options: [
      {
        name: "user",
        description: "The user to send the Nitros to",
        type: 6,
        required: true,
      },
      {
        name: "quantity",
        description: "The number of Nitros to give",
        type: 4,
        required: true,
      },
      {
        name: "item",
        description: "The item to give for",
        choices: [
          { name: "Nitro Basic", value: "NitroBasic" },
          { name: "Nitro Boost", value: "NitroBoost" },
        ],
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: "stocks",
    description:
      "Shows stock of Nitro Basic and Nitro Boost",
  },
  {
    name: "help",
    description:
      "Displays bot commands",
  },
    {
    name: "reset",
    description:
      "Reset the db of Nitro Basic or Nitro Boost",
    options: [
      {
        name: "item",
        description: "The item of Nitros to reset",
        type: 3,
        required: true,
        choices: [
          { name: "Nitro Basic", value: "NitroBasic" },
          { name: "Nitro Boost", value: "NitroBoost" },
        ],
      },
    ],
  },
  {
    name: "restock",
    description:
      "Restock Nitro Basic or Nitro Boost",
    options: [
      {
        name: "item",
        description: "The item of Nitros to restock",
        type: 3,
        required: true,
        choices: [
          { name: "Nitro Basic", value: "NitroBasic" },
          { name: "Nitro Boost", value: "NitroBoost" },
        ],
      },
      {
        name: "link",
        description: "The link to restock",
        type: 3,
        required: true,
      },
    ],
  },
];

const rest = new REST({ version: "10" }).setToken(config.token);
(async () => {
  try {
    // console.log("Started refreshing application (/) commands.");
    await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
      body: commands,
    });

    // console.log("Successfully reloaded application (/) commands.");
  } catch (e) {
    console.error(`Please specify the bot id in the config.clientId and specify a server in config.guildId otherwise the bot will not work : ${e}`);
  }
})();

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag} (${client.user.id})`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName, options, user } = interaction;
  const userId = user.id;

  if (!config.allowedUserIds.includes(userId)) {
    const embed = new EmbedBuilder()
      .setDescription(`\`🕷️\`〃*You are not authorized to use this command !*`)
      .setColor(config.color);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (commandName === "give") {
    const user = options.getUser("user");
    const quantity = options.getInteger("quantity");
    const item = options.getString("item");
  
    if (user.bot) {
      const embed = new EmbedBuilder()
        .setDescription(`\`❌\`〃*Bots cannot receive Nitro!*`)
        .setColor(config.color);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  
    if (!db.has(item)) db.set(item, []);
  
    const itemArray = db.get(item);
    if (itemArray.length < quantity) {
      const embed = new EmbedBuilder()
        .setDescription(`\`❌\`〃*Not enough ${item} to distribute!*`)
        .setColor(config.color);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    const codesToSend = itemArray.slice(0, quantity);
    try {
      const codeList = codesToSend
        .map((code, index) => `**\`${index + 1}\`** - || ${code} ||`)
        .join("\n");
      const embed = new EmbedBuilder()
        .setDescription(codeList)
        .setColor(config.color);
      await user.send({ embeds: [embed] });
  
      const remainingCodes = itemArray.slice(quantity);
      db.set(item, remainingCodes);
  
      const embed2 = new EmbedBuilder()
        .setDescription(`\`✅\`〃*${quantity} ${item} code(s) distributed to ${user} (\`${user.id}\`)!*`)
        .setColor(config.color);
      await interaction.reply({ embeds: [embed2] });
    } catch (e) {
      console.error(`❌〃Failed to send ${quantity} ${item} code(s) to ${user.tag} (\`${user.id}\`) : ${e}`);
      const embed = new EmbedBuilder()
        .setDescription(`\`❌\`〃*Failed to send ${quantity} ${item} code(s) to ${user} (\`${user.id}\`)!*`)
        .setColor(config.color);
      await interaction.reply({ embeds: [embed] });
      return;
    }
  } else if (commandName === "stocks") {
    const NitroBasic = db.get("NitroBasic") || [];
    const NitroBoost = db.get("NitroBoost") || [];

    const embed = new EmbedBuilder()
      .setTitle("\`🕷️\`〃Stocks de Nitro")
      .setDescription(`> *Nitro Basic :* \`${NitroBasic.length}\`\n> *Nitro Boost :* \`${NitroBoost.length}\``)
      .setColor(config.color);
    await interaction.reply({ embeds: [embed] });
  }else if (commandName === "help") {
    const embed = new EmbedBuilder()
      .setTitle("\`🕷️\`〃Help")
      .setDescription(`\`/help\`\n*-Displays bot commands*\n\`/stocks\`\n*-Shows stock of Nitro Basic and Nitro Boost*\n\`/restock\`\n*-Restock Nitro Basic or Nitro Boost*\n\`/give\`\n*-Give a Nitro to a user*\n\`/reset\`\n*-Reset the db of Nitro Basic or Nitro Boost*\n`)
      .setColor(config.color);
    await interaction.reply({ embeds: [embed] });
  } else if (commandName === "reset") {
    const item = options.getString("item");
    
    if (item === "NitroBasic" || item === "NitroBoost") {
        db.set(item, []);
        
        const embed = new EmbedBuilder()
            .setTitle("\`✅\`〃Successful Reset")
            .setDescription(`> *Database for \`${item}\` has been reset.*`)
            .setColor(config.color);
        await interaction.reply({ embeds: [embed] });
    } else {
        const embed = new EmbedBuilder()
            .setTitle("\`❌\`〃Reset error")
            .setDescription("> *Invalid reset item. Use `NitroBasic` or `NitroBoost`.*")
            .setColor(config.color);
        await interaction.reply({ embeds: [embed] });
    }
}
 else if (commandName === "restock") {
    const type = options.getString("item");
    const link = options.getString("link").split(/\s+/);
    let embed;
    if (type === "NitroBasic" || type === "NitroBoost") {
        const NitroBasic = db.get("NitroBasic") || [];
        const NitroBoost = db.get("NitroBoost") || [];
        const existingLink = db.get(type) || [];
        const updatedLink = [...existingLink, ...link];
        db.set(type, updatedLink);
        const totalLinks = type === "NitroBasic" ? NitroBasic.length : NitroBoost.length;
        embed = new EmbedBuilder()
            .setTitle("\`✅\`〃Successful restock")
            .setDescription(`> *Restocked \`${type}\` with \`${totalLinks + 1}\` links now.*`)
            .setColor(config.color);
    } else {
        embed = new EmbedBuilder()
            .setTitle("\`❌\`〃Restock error")
            .setDescription("> *Invalid restock type. Use `NitroBasic` or `NitroBoost`.*")
            .setColor(config.color);
    }
    await interaction.reply({ embeds: [embed] });
}
});

client.login(config.token);