export const router = {
  push: (_href: any) => {},
  replace: (_href: any) => {},
  back: () => {},
};

export function useRouter() {
  return router;
}

export function Link(props: any) {
  return null;
}

export default {
  router,
  useRouter,
  Link,
};
