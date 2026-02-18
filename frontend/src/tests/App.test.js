import { render, screen } from "@testing-library/react";
import App from "../App";

jest.mock("../api/axios", () => ({
  get: jest.fn(() => Promise.resolve({ data: [] })),
  post: jest.fn(() => Promise.resolve({ data: { access: "token", refresh: "token" } })),
}));

it("renders main navigation", () => {
  render(<App />);
  expect(screen.getByText(/Gestión de Stock/i)).toBeInTheDocument();
});
