# Deployment

## Overview

<!-- At most 5 sentences: environments, platform, and what this document owns. -->

<The system> runs on <platform> in <N> environments: <list>. This document owns where each
container runs, how it scales, and the order of a rollout. Settings are in
[Configuration](../operations/configuration.md).

## Topology

<!-- C4 deployment view: nodes, network path from the user, data stores, trust boundaries.
Draw with the technical-diagrams skill. -->

![<The network path from the browser to each workload and data store>](diagrams/deployment-topology.drawio.svg)

## Workloads

| No. | Workload | Replicas | Scaling | Responsibility |
|---|---|---|---|---|
| 1 | <name> | <n> | <fixed, or the metric that scales it> | <One sentence.> |

## Network and endpoints

| No. | Endpoint | Routed to | Timeout | Notes |
|---|---|---|---|---|
| 1 | `<host/path>` | <workload> | <value> | <One fact.> |

## Data stores

| No. | Store | Used by | Backup | Retention |
|---|---|---|---|---|
| 1 | <name> | <workloads> | <how often, where> | <how long> |

## Rollout

<!-- The order of a deploy: migrations, then workloads. If the order has branches, add a draw.io flowchart. -->

1. <Step.>

## Platform requirements

<!-- Requirements that the platform or the infrastructure repository must satisfy. -->

| No. | Requirement | Value | Why |
|---|---|---|---|
| 1 | <name> | <value> | <One sentence.> |

## Verification

| No. | Item | How to check | Status |
|---|---|---|---|
| 1 | <requirement> | <command or observation> | <verified on date / not verified> |

## Decisions

- **D1. <Decision.>** <Why.> Rejected: <option, reason>.

## Limits and open questions

- <Item.> Status: <accepted limit | open>.

## Related documents

- [<Document>](<path>): <why>.
