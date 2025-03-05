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

  type GameListResponse {
    games: [Game!]!
    hasMore: Boolean!
  }

  type User {
    id: ID!
    name: String!
    email: String!
    avatar: String
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type RecommendedGame {
    name: String!
    description: String
    category: String
  }

  interface MutationResponse {
    success: Boolean!
    message: String!
    error: String
  }

  type BaseResponse implements MutationResponse {
    success: Boolean!
    message: String!
    error: String
  }

  type AddGameResponse implements MutationResponse {
    success: Boolean!
    message: String!
    error: String
    game: Game
  }

  type AuthResponse implements MutationResponse {
    success: Boolean!
    message: String!
    error: String
    auth: AuthPayload
  }

  type UploadImageResponse implements MutationResponse {
    success: Boolean!
    message: String!
    error: String
    url: String
  }

  type GenerateShareLinkResponse implements MutationResponse {
    success: Boolean!
    message: String!
    error: String
    shareLink: String
  }

  type DeleteGameResponse implements MutationResponse{
    success: Boolean!
    message: String!
    error: String
    id: ID!
  }

  type Query {
    game(id: ID!): Game
    games(category: String, minRating: Float, limit: Int, offset: Int): GameListResponse!
    sharedGames(shareId: ID!): SharedGames!
    recommendedGamesAI: [RecommendedGame!]!
  }

  type Mutation {
    addGame(addGameInput: AddGameInput!): AddGameResponse
    forgotPassword(email: String!): BaseResponse!
    resetPassword(token: String!, newPassword: String!): BaseResponse!
    deleteGame(id: ID!): DeleteGameResponse!
    generateShareLink: GenerateShareLinkResponse!
    register(name: String!, email: String!, password: String!): AuthResponse!
    login(email: String!, password: String!): AuthResponse!
    uploadImage(file: Upload!): UploadImageResponse!
    updateGame(updateGameInput: UpdateGameInput!): AddGameResponse
  }
`;

export default typeDefs;
