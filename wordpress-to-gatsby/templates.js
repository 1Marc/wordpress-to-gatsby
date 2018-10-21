const postTemplate = params => {
  const post = `---
path: "${params.slug}"
title: ${params.title}
description: ${params.description}
tags: ${params.categories}
date: "${params.date}"
draft: false
layout: "post"
---

${params.content}`;
  return post;
};

module.exports = { post: postTemplate };
