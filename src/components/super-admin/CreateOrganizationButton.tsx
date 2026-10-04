"use client";

import Button from "@/components/ui/button/Button";
import { PlusIcon } from "@/icons";
import { useTranslations } from "next-intl";
import { useState } from "react";
import CreateOrganizationModal from "./CreateOrganizationModal";

const CreateOrganizationButton: React.FC = () => {
  const t = useTranslations("superAdmin");
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        size="sm"
        startIcon={<PlusIcon />}
        onClick={() => setIsOpen(true)}
      >
        {t("organizations.create")}
      </Button>
      <CreateOrganizationModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};

export default CreateOrganizationButton;
