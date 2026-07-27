export default function ErrorPage({ data }: { data: { message?: string } }) {
  return <p>Something went wrong: {data.message ?? "Unknown error"}</p>;
}
