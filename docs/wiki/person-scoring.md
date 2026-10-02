# Person scoring

Page: `/people`. API: `POST /api/v1/score/person`. Orchestration: `lib/person-score-service.ts`. Narrative: `lib/person-reasoning.ts`.

A person is identified by email, LinkedIn URL, or name. The five signals and their maximum points:

| Signal | Max | Module |
|--------|----:|--------|
| Career change | 30 | `lib/signals/person/career-change.ts` |
| Seniority fit | 20 | `lib/signals/person/seniority-fit.ts` |
| Company intent | 20 | `lib/signals/person/company-intent.ts` |
| News mentions | 15 | `lib/signals/person/news-mentions.ts` |
| Social presence | 15 | `lib/signals/person/social-presence.ts` |

Company intent reuses the company score for the person's organization. News mentions use GNews when `MOCK_SIGNALS` is not set.

## Enrichment

The live path calls `enrichPerson` from `lib/pdl.ts`. That function builds an `ApolloPersonData` record from the fields the caller already sent. It does not call Apollo or People Data Labs. With `MOCK_SIGNALS=true` it returns `getMockApolloData` from `lib/apollo.ts`.

`lib/apollo.ts` still contains an Apollo People Match client gated on `APOLLO_API_KEY`. `person-score-service` does not import it. Do not document person scores as Apollo-enriched unless that import changes.

The reasoning prompt asks for a person brief: summary, approach angle, connection hooks, email subject, and talk track. It is a person brief, not a second company score.

## Related

- [What it does](what-it-does.md)
- [Score API](score-api.md)
