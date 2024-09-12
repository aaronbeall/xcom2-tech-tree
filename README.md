# XCOM 2 Tech Tree

Based on the excellent [XCOM 2 Tech Tree project from darosh](https://darosh.github.io/xcom2-tech-tree/). Updated to add all DLC content (War of the Chosen, Alien Hunters, Shen's Last Gift, and Tactical Legacy Pack).

[Live version](https://aaronbeall.github.io/xcom2-tech-tree/).

## Development

The data was orignally pulled from an [XML project](https://github.com/mstum/xcom2) that no longer exists, here the data is manually maintained in `xcom-tech-tree.min.js`.

### Install

```
npm install
```

### Publish

```
npm run pubish
```

### Deprecated

All the `gulp` and `bower` related stuff is no longer used.

### Todo

- [ ] Sticky header
- [ ] Complete all the resource costs, rework the difficulty breakdown to get rid of useless repeats and ?
- [ ] Hover a node to highlight its neighbor connections
- [ ] Tooltip should say its prequisites and unlocks (prev and next neighbors)
- [ ] Tooltip should say what soldier class weapons belong to
- [ ] Show tooltips on legend items
- [ ] Show DLC source on nodes
- [ ] Fix Save action
- [ ] Cleanup dead dev stuff
