const feedRead = require("davefeedread");
const TurndownService = require("turndown");
const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced"
});
const cheerio = require("cheerio");
const uuid = require("uuid/v4"); // v4 generates random UUIDs
const url = require("url");
const path = require("path");

const importPosts = async file => {
  const feed = await parseFeed(file);

  // Filter for only blog posts
  var items = feed.items.filter(
    (item, index) => item["wp:post_type"]["#"] === "post"
  );

  // Map to new object type
  items = items.map(item => {
    if (item["wp:post_type"]["#"] !== "post") {
      return;
    }
    if (item["wp:status"]["#"] !== "publish") {
      return;
    }

    var description = "";

    if (Array.isArray(item["wp:postmeta"])) {
      item["wp:postmeta"].map(meta => {
        if (meta["wp:meta_key"]["#"] === "_yoast_wpseo_metadesc") {
          description = meta["wp:meta_value"]["#"];
        }
      });
    }

    const mappedItem = {
      title: item.title,
      description: description ? description : "",
      date:
        item.date != "Invalid Date"
          ? item.date
          : new Date("2007-05-05T17:00:00.000Z"),
      content: item["content:encoded"]["#"],
      categories: item.categories,
      slug: item["wp:post_name"]["#"]
    };

    if (!mappedItem.content) {
      return;
    }

    // Add images array
    const images = parseImages(mappedItem.content);
    images.forEach(image => {
      mappedItem.content = mappedItem.content.replace(
        image.url,
        image.fileName
      );
    });
    mappedItem.images = images;

    // Add Markdown conversion
    mappedItem.markdownContent = turndownService.turndown(mappedItem.content);

    return mappedItem;
  });

  return items;
};

const parseFeed = file => {
  return new Promise((resolve, reject) => {
    feedRead.parseString(file, undefined, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
};

const parseImages = content => {
  const postElements = cheerio.load(content);
  const imagesElements = postElements("img");
  const images = imagesElements
    .filter((index, item) => {
      return item.attribs["src"].includes("marcgrabanski.com");
    })
    .map((index, item) => {
      const imageName = uuid();
      const imageUrl = item.attribs["src"];
      const imageExtension = path.extname(url.parse(imageUrl).pathname);
      return {
        url: imageUrl,
        fileName: `${imageName}${imageExtension}`
      };
    })
    .toArray();
  return images;
};

const removeSquarespaceCaptions = post => {
  // remove the caption crap that gets put in by squarespace
  post = post.replace(/(\[caption.*"])(<.*>)(.*\[\/caption])/g, "$2");
  return post;
};

module.exports = { importPosts: importPosts };
