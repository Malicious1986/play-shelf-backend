import { gql } from "apollo-server-express";

const typeDefs = gql`
  scalar Upload

  input AddGameInput {
    name: String!
    description: String
    image: String
    category: String
    rating: Float
  }

  input UpdateGameInput {
    id: ID!
    name: String
    description: String
    rating: Float
    image: String
    category: String
  }

  type Game {
    id: ID!
    name: String!
    description: String
    rating: Float
    image: String
    category: String
  }

  type SharedGames {
    username: String!
    games: [Game!]!
  }

  type Query {
    game(id: ID!): Game
    games(category: String, minRating: Float): [Game!]!
    sharedGames(shareId: ID!): SharedGames!
  }

  type Mutation {
    addGame(addGameInput: AddGameInput!): Game
    deleteGame(id: ID!): String
    generateShareLink: String!
    uploadImage(file: Upload!): String!
    updateGame(updateGameInput: UpdateGameInput!): Game
  }
`;

export default typeDefs;
