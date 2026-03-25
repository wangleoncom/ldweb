# V2.0 Firestore 結構

## users/{uid}
- uid
- email
- displayName
- role
- createdAt
- lastLoginAt
- showHistory
- isActive

## users/{uid}/quiz_results/{docId}
- uid
- playerName
- score
- total
- title
- createdAt

## users/{uid}/qa_history/{docId}
- uid
- question
- answer
- source
- createdAt
