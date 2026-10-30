// @vitest-environment jsdom

import { faker } from "@faker-js/faker/locale/pt_BR";
import { render, screen } from "@testing-library/react";
import { LocationForm } from "@/app/teams/[id]/locations/_components/LocationForm";

faker.seed(20261030);

const t = {
  common: { cancel: "Cancelar" },
  locationForm: {
    nameLabel: "Nome",
    descriptionLabel: "Descrição",
    namePlaceholder: "Digite o nome da localização",
    descriptionPlaceholder: "Digite a descrição da localização (opcional)",
    creating: "Criando...",
    createAction: "Criar Localização",
    updating: "Atualizando...",
    updateAction: "Atualizar Localização",
  },
};

describe("LocationForm", () => {
  it("uses i18n labels instead of hardcoded English Name/Description", () => {
    render(
      <LocationForm
        t={t}
        name={faker.location.street()}
        description={faker.lorem.sentence()}
        isLoading={false}
        mode="create"
        cancelHref="/teams/94/locations"
        onSubmit={(event) => event.preventDefault()}
        onNameChange={() => undefined}
        onDescriptionChange={() => undefined}
      />
    );

    expect(screen.getByLabelText(/Nome/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Descrição$/)).toBeInTheDocument();
    expect(screen.queryByText(/^Name$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Description$/)).not.toBeInTheDocument();
  });
});
