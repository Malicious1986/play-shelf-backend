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

  type Query {
    games(category: String, minRating: Float): [Game!]!
    game(id: ID!): Game
  }

  type Mutation {
    addGame(addGameInput: AddGameInput!): Game
    updateGame(updateGameInput: UpdateGameInput!): Game
    deleteGame(id: ID!): String
    uploadImage(file: Upload!): String!
  }
`;

export default typeDefs;
