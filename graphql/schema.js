import { gql } from "apollo-server-express";

const typeDefs = gql`
  scalar Upload

  type Game {
    id: ID!
    name: String!
    description: String
    rating: Float
    image: String
    category: String
  }

  type Query {
    games: [Game]
    game(id: ID!): Game
  }

  type Mutation {
    addGame(name: String!, description: String, rating: Float, image: String, category: String): Game
    updateGame(id: ID!, name: String, description: String, rating: Float, image: String, category: String): Game
    deleteGame(id: ID!): String
    uploadImage(file: Upload!): String!
  }
`;

export default typeDefs;
