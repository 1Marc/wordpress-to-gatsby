const fs = require("fs-extra");
const fetch = require("node-fetch");

const templates = require("./templates.js");

function pad(number) {
  if (number < 10) {
    return "0" + number;
  }
  return number;
}

const exportPosts = (posts, rootPath) => {
  if (!rootPath.endsWith("/")) {
    rootPath = rootPath + "/";
  }

  posts.filter(p => p != null).forEach(async post => {
    let postPath = `${__dirname}/${rootPath}-${post.slug}`;
    if (post.date) {
      const datePath =
        post.date.getUTCFullYear() +
        "-" +
        pad(post.date.getUTCMonth() + 1) +
        "-" +
        pad(post.date.getUTCDate());
      postPath = `${__dirname}/${rootPath}${datePath}-${post.slug}`;
    }
    await fs.ensureDir(postPath);

    if (post.images) {
      post.images.forEach(async image => {
        try {
          const imageResponse = await fetch(image.url);
          const writeStream = fs.createWriteStream(
            `${postPath}/${image.fileName}`
          );
          imageResponse.body.pipe(writeStream);
          await streamAsync(writeStream);
        } catch (error) {
          console.error(error);
        }
      });
    }

    post.title = post.title.replace(/"/g, '\\"'); // escape quotes
    const fileContents = templates.post({
      title: JSON.stringify(post.title),
      description: JSON.stringify(post.description),
      slug: post.slug,
      date: post.date ? post.date.toISOString() : null,
      categories: post.categories
        .map(c => `\n  - "${c.replace("&amp;", "&")}"`)
        .join(""),
      content: post.markdownContent
    });
    await fs.outputFile(`${postPath}/index.md`, fileContents);
  });
};

const streamAsync = stream => {
  return new Promise((resolve, reject) => {
    stream.on("end", () => {
      resolve("end");
    });
    stream.on("finish", () => {
      resolve("finish");
    });
    stream.on("error", error => {
      reject(error);
    });
  });
};

module.exports = { exportPosts: exportPosts };
