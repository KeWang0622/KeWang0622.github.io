---
layout: publication
permalink: /publications/
title: publications
description: publications
nav: true
nav_order: 1
---
<!-- _pages/publications.md -->

<p>An up-to-date list is available on <a href="https://scholar.google.com/citations?user=Iz3m3v4AAAAJ&hl=en" target="_blank" rel="noopener noreferrer">Google Scholar</a>.</p>

<div class="publications">

{% bibliography -f {{ site.scholar.bibliography }} --group_by year --group_order descending %}

</div>
